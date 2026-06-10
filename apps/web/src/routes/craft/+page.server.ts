import {
	applyRepairKitToItemForPilot,
	craftFieldRepairKitForPilot,
	craftSchematicForPilot,
	craftSurveyScannerForPilot,
	equipScannerItemForPilot,
	equipThumperPartForPilot
} from '@async-frontier-mmo/db';
import { FIELD_REPAIR_KIT, MVP_SCHEMATIC_BY_ID, SURVEY_SCANNER_MK_I } from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';
import {
	loadCraftScreen,
	parseCraftMode,
	parseSlotInstanceId,
	parseTuningFromForm
} from '$lib/server/craftLoad';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackCraftCommitted,
	trackCraftScreenViewed,
	trackItemEquipped
} from '$lib/server/playtestTelemetry';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const gate = await requireFrameChosenPilot(db, pilotId);
	if (gate) {
		redirect(303, '/');
	}

	return loadCraftScreenWithTelemetry(db, pilotId, event.url);
};

async function loadCraftScreenWithTelemetry(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL
) {
	const screen = await loadCraftScreen(db, pilotId, url);
	const schematic = MVP_SCHEMATIC_BY_ID[screen.selectedSchematicId] ?? SURVEY_SCANNER_MK_I;
	const allSlotsFilled = schematic.slots.every((slot) => Boolean(screen.slotSelections[slot.id]));
	const hasRepairableGear =
		screen.fieldRepairKitCount > 0 &&
		[...screen.scannerItems, ...screen.thumperPartItems].some(
			(item) => item.condition < 100 || item.integrity < 100
		);

	await trackCraftScreenViewed(db, pilotId, {
		selectedSchematicId: screen.selectedSchematicId,
		allocationHintCount: screen.allocationHints.length,
		inventory: screen.inventory,
		schematic,
		slotSelections: screen.slotSelections,
		tuning: screen.tuning,
		tuningTotal: screen.tuningTotal,
		allSlotsFilled,
		hasRepairableGear
	});

	return screen;
}

export const actions: Actions = {
	craft: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const gate = await requireFrameChosenPilot(db, pilotId);
		if (gate) return gate;

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
			return fail(400, { message: outcome.reason });
		}

		await trackCraftCommitted(db, pilotId, {
			schematicId: schematic.id,
			craftMode,
			itemDisplayName: outcome.item.displayName
		});

		const screen = await loadCraftScreenWithTelemetry(db, pilotId, event.url);

		return {
			...screen,
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			}
		};
	},

	equipScanner: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const gate = await requireFrameChosenPilot(db, pilotId);
		if (gate) return gate;

		const formData = await event.request.formData();
		const itemId = formData.get('itemId');
		if (typeof itemId !== 'string' || itemId.length === 0) {
			return fail(400, { message: 'Invalid scanner item' });
		}

		const outcome = await equipScannerItemForPilot(db, { pilotId, itemId });
		if (outcome.status === 'invalid') {
			return fail(400, { message: outcome.reason });
		}

		await trackItemEquipped(db, pilotId, {
			itemKind: 'scanner',
			displayName: outcome.item.displayName
		});

		const screen = await loadCraftScreenWithTelemetry(db, pilotId, event.url);
		return {
			...screen,
			equipOutcome: {
				displayName: outcome.item.displayName,
				surveyClarity: outcome.item.propertyScores.survey_clarity ?? 0
			}
		};
	},

	equipThumperPart: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const gate = await requireFrameChosenPilot(db, pilotId);
		if (gate) return gate;

		const formData = await event.request.formData();
		const slot = formData.get('slot');
		const itemId = formData.get('itemId');

		if (slot !== 'drill' && slot !== 'pump' && slot !== 'hull') {
			return fail(400, { message: 'Invalid thumper part slot' });
		}

		const outcome = await equipThumperPartForPilot(db, {
			pilotId,
			slot,
			itemId: typeof itemId === 'string' && itemId.length > 0 ? itemId : null
		});

		if (outcome.status === 'invalid') {
			return fail(400, { message: outcome.reason });
		}

		if (outcome.status === 'equipped') {
			await trackItemEquipped(db, pilotId, {
				itemKind: 'thumper_part',
				displayName: outcome.item.displayName,
				slot: outcome.slot
			});
		}

		const screen = await loadCraftScreenWithTelemetry(db, pilotId, event.url);
		return {
			...screen,
			equipThumperOutcome:
				outcome.status === 'equipped'
					? {
							slot: outcome.slot,
							displayName: outcome.item.displayName,
							condition: outcome.item.condition,
							integrity: outcome.item.integrity
						}
					: { slot: outcome.slot, action: 'unequipped' as const }
		};
	},

	repairItem: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const gate = await requireFrameChosenPilot(db, pilotId);
		if (gate) return gate;

		const formData = await event.request.formData();
		const itemId = formData.get('itemId');
		if (typeof itemId !== 'string' || itemId.length === 0) {
			return fail(400, { message: 'Invalid repair target' });
		}

		const outcome = await applyRepairKitToItemForPilot(db, { pilotId, targetItemId: itemId });
		if (outcome.status === 'no_repair_kit') {
			return fail(400, { message: 'No Field Repair kits available' });
		}
		if (outcome.status === 'invalid_target') {
			return fail(400, { message: outcome.reason });
		}

		const screen = await loadCraftScreenWithTelemetry(db, pilotId, event.url);
		return {
			...screen,
			repairOutcome: {
				displayName: outcome.item.displayName,
				condition: outcome.item.condition,
				integrity: outcome.item.integrity,
				fieldRepairKitCount: outcome.fieldRepairKitCount
			}
		};
	}
};
