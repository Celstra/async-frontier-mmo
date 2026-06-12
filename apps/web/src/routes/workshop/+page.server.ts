import {
	countPlaytestEventsByName,
	craftFieldRepairKitForPilot,
	craftSchematicForPilot,
	craftSurveyScannerForPilot,
	ensureStarterThumperPartsForPilot,
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
	type OwnedThumperPart
} from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackCraftCommitted,
	trackRigAssembled,
	trackWorkshopViewed
} from '$lib/server/playtestTelemetry';
import { advanceTutorialStepIf } from '$lib/server/tutorialOrchestration';
import {
	loadWorkshopScreen,
	parseCraftMode,
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
		selectedSchematicId: screen.selectedSchematicId
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

		const craftInput = {
			pilotId,
			idempotencyKey,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey
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

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			...(await workshopData(db, pilotId, event.url))
		};
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
		await advanceTutorialStepIf(db, pilotId, 'assemble_rig', 'first_deploy');

		return workshopData(db, pilotId, event.url, { rigAssembled: true });
	}
};
