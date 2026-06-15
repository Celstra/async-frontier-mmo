import {
	countPlaytestEventsByName,
	craftFieldRepairKitForPilot,
	craftSchematicForPilot,
	craftSurveyScannerForPilot,
	ensureStarterThumperPartsForPilot,
	equipScannerItemForPilot,
	equipThumperPartForPilot,
	getSettlementMilestoneUnlockedAt,
	listThumperPartItemsForPilot
} from '@async-frontier-mmo/db';
import {
	FIELD_REPAIR_KIT,
	MVP_SCHEMATIC_BY_ID,
	SURVEY_SCANNER_MK_I,
	THUMPER_CHASSIS_ASSEMBLY,
	thumperPartSlotForSchematic,
	validateChassisAssembly,
	type OwnedThumperPart,
	type ThumperPartSlot
} from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import { buildWorkshopCraftOutcome } from '$lib/server/craftOutcome';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackCraftCommitted,
	trackCraftResultAbandoned,
	trackCraftResultCompareClicked,
	trackCraftResultCraftAnotherClicked,
	trackCraftResultInstallConfirmed,
	trackCraftResultPulseViewed,
	trackCraftResultRevealSeen,
	trackItemEquipped,
	trackOverdriveCritScrapSeen,
	trackRigAssembled,
	trackWorkshopViewed,
	trackWorkshopStationViewed
} from '$lib/server/playtestTelemetry';
import { isRigEquipmentLocked, RIG_EQUIPMENT_LOCKED_MESSAGE } from '$lib/server/rigEquipmentLock';
import {
	advanceTutorialStepIf,
	maybeAdvanceToFirstDeployAfterRigAssembly
} from '$lib/server/tutorialOrchestration';
import {
	loadWorkshopScreen,
	parseCraftMode,
	parseExperimentPulses,
	parseSlotInstanceId,
	parseTuningFromForm
} from '$lib/server/workshopLoad';
import type { Actions, PageServerLoad } from './$types';

function thumperPartsFromInventory(
	items: Awaited<ReturnType<typeof listThumperPartItemsForPilot>>
): OwnedThumperPart[] {
	return items.flatMap((item) => {
		const slot = thumperPartSlotForSchematic(item.schematicId);
		if (!slot) return [];
		return [
			{
				itemId: item.id,
				schematicId: item.schematicId,
				displayName: item.displayName,
				slot,
				condition: item.condition,
				integrity: item.integrity
			}
		];
	});
}

async function workshopData(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL,
	options?: { rigAssembled?: boolean }
) {
	const rigAssembled =
		options?.rigAssembled ??
		(await countPlaytestEventsByName(db, pilotId, 'rig_assembled')) > 0;
	return loadWorkshopScreen(db, pilotId, url, { rigAssembled });
}

function parseThumperSlot(value: FormDataEntryValue | null): ThumperPartSlot | null {
	if (value === 'hull' || value === 'drill' || value === 'pump') {
		return value;
	}
	return null;
}

async function rejectEquipmentChangeIfLocked(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL
) {
	if (!(await isRigEquipmentLocked(db, pilotId))) {
		return null;
	}

	return fail(400, {
		message: RIG_EQUIPMENT_LOCKED_MESSAGE,
		...(await workshopData(db, pilotId, url))
	});
}

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	let screen = await workshopData(db, pilotId, event.url);
	if (screen.showChassisAssembly) {
		await ensureStarterThumperPartsForPilot(db, pilotId);
		screen = await workshopData(db, pilotId, event.url);
	}

	await trackWorkshopViewed(db, pilotId, {
		selectedSchematicId: screen.selectedSchematicId ?? 'none'
	});
	await trackWorkshopStationViewed(db, pilotId, {
		station: screen.workshopStation,
		selectedSchematicId: screen.selectedSchematicId ?? 'none'
	});

	return screen;
};

export const actions: Actions = {
	craft: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const schematicId = formData.get('schematicId');
		const idempotencyKey = formData.get('idempotencyKey');
		const craftMode = parseCraftMode(formData.get('craftMode'));

		if (typeof schematicId !== 'string' || !MVP_SCHEMATIC_BY_ID[schematicId]) {
			return fail(400, { message: 'Invalid schematic' });
		}

		const schematic = MVP_SCHEMATIC_BY_ID[schematicId]!;
		const tuning = parseTuningFromForm(schematic, formData);

		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing craft idempotency key' });
		}
		if (!craftMode) {
			return fail(400, { message: 'Invalid craft mode' });
		}
		if (!tuning) {
			return fail(400, { message: 'Allocate exactly 3 tuning points' });
		}

		const slotInputs = schematic.slots.map((slot) => {
			const resourceInstanceId = parseSlotInstanceId(formData, slot.id);
			if (!resourceInstanceId) {
				return null;
			}
			return { slotId: slot.id, resourceInstanceId };
		});

		if (slotInputs.some((slot) => slot === null)) {
			return fail(400, { message: 'Every schematic slot must be filled' });
		}

		const experimentPulses =
			craftMode === 'careful_experiment'
				? parseExperimentPulses(schematic, formData)
				: undefined;
		if (craftMode === 'careful_experiment' && experimentPulses === null) {
			return fail(400, {
				message: 'Choose a property line and push size for both experiment pulses'
			});
		}

		const craftInput = {
			pilotId,
			idempotencyKey,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey,
			...(experimentPulses ? { experimentPulses } : {})
		};

		const outcome =
			schematic.id === SURVEY_SCANNER_MK_I.id
				? await craftSurveyScannerForPilot(db, craftInput)
				: schematic.id === FIELD_REPAIR_KIT.id
					? await craftFieldRepairKitForPilot(db, craftInput)
					: await craftSchematicForPilot(db, { ...craftInput, schematic });

		if (outcome.status === 'invalid_craft') {
			return fail(400, {
				message: outcome.reason,
				...(await workshopData(db, pilotId, event.url))
			});
		}

		await trackCraftCommitted(db, pilotId, {
			schematicId: schematic.id,
			craftMode,
			itemDisplayName: outcome.item.displayName
		});

		const craftOutcome = await buildWorkshopCraftOutcome(db, pilotId, {
			schematic,
			status: outcome.status,
			item: outcome.item,
			explanation: outcome.explanation
		});

		await trackCraftResultRevealSeen(db, pilotId, {
			schematicId: schematic.id,
			itemId: outcome.item.id,
			craftMode
		});

		if ((craftOutcome.explanation.experimentScrapUnits ?? 0) > 0) {
			await trackOverdriveCritScrapSeen(db, pilotId, {
				schematicId: schematic.id,
				itemId: outcome.item.id,
				scrapUnits: craftOutcome.explanation.experimentScrapUnits
			});
		}

		return {
			craftOutcome,
			...(await workshopData(db, pilotId, event.url))
		};
	},

	installCraftedItem: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);
		const locked = await rejectEquipmentChangeIfLocked(db, pilotId, event.url);
		if (locked) return locked;

		const formData = await event.request.formData();
		const itemId = formData.get('itemId');
		const installKind = formData.get('installKind');

		if (typeof itemId !== 'string') {
			return fail(400, {
				message: 'Pick an item to install',
				...(await workshopData(db, pilotId, event.url))
			});
		}

		if (installKind === 'scanner') {
			const outcome = await equipScannerItemForPilot(db, { pilotId, itemId });
			if (outcome.status === 'invalid') {
				return fail(400, {
					message: outcome.reason,
					...(await workshopData(db, pilotId, event.url))
				});
			}

			await trackItemEquipped(db, pilotId, {
				itemKind: 'scanner',
				displayName: outcome.item.displayName
			});
			await trackCraftResultInstallConfirmed(db, pilotId, {
				itemId,
				installKind: 'scanner'
			});

			return workshopData(db, pilotId, event.url);
		}

		const slot = parseThumperSlot(formData.get('slot'));
		if (!slot || installKind !== 'thumper_part') {
			return fail(400, {
				message: 'Pick a valid install target',
				...(await workshopData(db, pilotId, event.url))
			});
		}

		const outcome = await equipThumperPartForPilot(db, { pilotId, slot, itemId });
		if (outcome.status === 'invalid') {
			return fail(400, {
				message: outcome.reason,
				...(await workshopData(db, pilotId, event.url))
			});
		}

		if (outcome.status === 'equipped') {
			await trackItemEquipped(db, pilotId, {
				itemKind: 'thumper_part',
				displayName: outcome.item.displayName,
				slot
			});
			await trackCraftResultInstallConfirmed(db, pilotId, {
				itemId,
				installKind: 'thumper_part',
				slot
			});
		}

		return workshopData(db, pilotId, event.url);
	},

	craftRevealTelemetry: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const telemetryEvent = formData.get('telemetryEvent');
		const itemId = formData.get('itemId');
		const schematicId = formData.get('schematicId');

		const payload = {
			...(typeof itemId === 'string' ? { itemId } : {}),
			...(typeof schematicId === 'string' ? { schematicId } : {})
		};

		if (telemetryEvent === 'craft_result_compare_clicked') {
			await trackCraftResultCompareClicked(db, pilotId, payload);
		} else if (telemetryEvent === 'craft_result_craft_another_clicked') {
			await trackCraftResultCraftAnotherClicked(db, pilotId, payload);
		} else if (telemetryEvent === 'craft_result_pulse_viewed') {
			await trackCraftResultPulseViewed(db, pilotId, payload);
		} else if (telemetryEvent === 'craft_result_abandoned') {
			await trackCraftResultAbandoned(db, pilotId, payload);
		}

		return { ok: true };
	},

	assembleRig: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const fabricatorUnlockedAt = await getSettlementMilestoneUnlockedAt(db, {
			pilotId,
			milestoneKey: 'fabricator_online'
		});
		if (!fabricatorUnlockedAt) {
			return fail(403, {
				message: 'Bring the fabricator online at SETTLEMENT before assembling the rig',
				...(await workshopData(db, pilotId, event.url))
			});
		}

		if ((await countPlaytestEventsByName(db, pilotId, 'rig_assembled')) > 0) {
			return fail(400, {
				message: 'Rig already assembled',
				...(await workshopData(db, pilotId, event.url, { rigAssembled: true }))
			});
		}

		const formData = await event.request.formData();
		const selections = {
			hull: formData.get('chassis_hull'),
			drill: formData.get('chassis_drill'),
			pump: formData.get('chassis_pump')
		};

		const ownedParts = thumperPartsFromInventory(await listThumperPartItemsForPilot(db, pilotId));
		const validated = validateChassisAssembly({
			selections: {
				hull: typeof selections.hull === 'string' ? selections.hull : undefined,
				drill: typeof selections.drill === 'string' ? selections.drill : undefined,
				pump: typeof selections.pump === 'string' ? selections.pump : undefined
			},
			ownedParts
		});

		if (!validated.valid) {
			return fail(400, {
				message: validated.reason,
				...(await workshopData(db, pilotId, event.url))
			});
		}

		for (const slot of ['drill', 'pump', 'hull'] as const) {
			const outcome = await equipThumperPartForPilot(db, {
				pilotId,
				slot,
				itemId: validated.selections[slot]
			});
			if (outcome.status === 'invalid') {
				return fail(400, {
					message: outcome.reason,
					...(await workshopData(db, pilotId, event.url))
				});
			}
		}

		await trackRigAssembled(db, pilotId);
		if (!(await advanceTutorialStepIf(db, pilotId, 'assemble_rig', 'first_deploy'))) {
			await maybeAdvanceToFirstDeployAfterRigAssembly(db, pilotId);
		}

		return workshopData(db, pilotId, event.url, { rigAssembled: true });
	}
};
