import {
	countFieldRepairKitsForPilot,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	getResourceInstanceById,
	listPilotResourceStacksWithInstances,
	listScannerItemsForPilot,
	listThumperPartItemsForPilot
} from '@async-frontier-mmo/db';
import {
	BASIC_DRILL_HEAD,
	buildResourceAllocationHints,
	deemphasizedStatsForSlotFamily,
	EFFICIENT_PUMP,
	FIELD_REPAIR_KIT,
	FIRST_REPAIR_KIT_SUGGESTED_TUNING,
	FIRST_SCANNER_SUGGESTED_TUNING,
	MVP_CRAFT_SCHEMATICS,
	MVP_SCHEMATIC_BY_ID,
	previewCraftProperties,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I,
	type CraftMode,
	type ResourceFamily,
	type SchematicDefinition,
	type SchematicSlotFill,
	type TuningAllocation,
	thumperPartSlotForSchematic
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

const SUGGESTED_TUNING: Record<string, TuningAllocation> = {
	[SURVEY_SCANNER_MK_I.id]: FIRST_SCANNER_SUGGESTED_TUNING,
	[FIELD_REPAIR_KIT.id]: FIRST_REPAIR_KIT_SUGGESTED_TUNING,
	[EFFICIENT_PUMP.id]: { recovery_efficiency: 2, clog_resistance: 1, field_stability: 0 },
	[BASIC_DRILL_HEAD.id]: { extraction_rate: 2, depth_access: 1, wear_control: 0 },
	[REINFORCED_HULL_PLATE.id]: { max_condition: 2, damage_reduction: 1, repairability: 0 }
};

export function schematicToCraftUi(schematic: SchematicDefinition) {
	return {
		id: schematic.id,
		displayName: schematic.displayName,
		slots: schematic.slots,
		properties: schematic.properties.map((property) => ({
			id: property.id,
			displayName: property.displayName,
			terms: property.terms.map((term) => {
				if (term.kind === 'average_oq') {
					return {
						kind: 'average_oq' as const,
						label: `Average OQ (${Math.round(term.weight * 100)}%)`,
						weightPercent: Math.round(term.weight * 100)
					};
				}

				const slot = schematic.slots.find((row) => row.id === term.slotId);
				return {
					kind: 'slot_stat' as const,
					label: `${slot?.displayName ?? term.slotId} · ${term.stat} (${Math.round(term.weight * 100)}%)`,
					weightPercent: Math.round(term.weight * 100),
					slotId: term.slotId,
					stat: term.stat
				};
			})
		}))
	};
}

export function parseCraftMode(value: FormDataEntryValue | null): CraftMode | null {
	if (value === 'safe_craft' || value === 'careful_experiment') {
		return value;
	}
	return null;
}

export function parseTuningFromParams(
	schematic: SchematicDefinition,
	params: URLSearchParams
): TuningAllocation {
	const tuning: TuningAllocation = {};
	for (const property of schematic.properties) {
		const raw = params.get(`tuning_${property.id}`);
		if (raw === null) continue;
		const points = Number.parseInt(raw, 10);
		if (Number.isInteger(points) && points >= 0) {
			tuning[property.id] = points;
		}
	}
	return tuning;
}

export function parseTuningFromForm(
	schematic: SchematicDefinition,
	formData: FormData
): TuningAllocation | null {
	const tuning: TuningAllocation = {};

	for (const property of schematic.properties) {
		const points = Number.parseInt(String(formData.get(`tuning_${property.id}`)), 10);
		if (!Number.isInteger(points) || points < 0) {
			return null;
		}
		tuning[property.id] = points;
	}

	const total = Object.values(tuning).reduce((sum, points) => sum + points, 0);
	if (total !== 3) {
		return null;
	}

	return tuning;
}

export function parseSlotSelections(
	schematic: SchematicDefinition,
	params: URLSearchParams | FormData
): Record<string, string> {
	const selections: Record<string, string> = {};
	for (const slot of schematic.slots) {
		const value = params.get(`slot_${slot.id}`);
		if (typeof value === 'string' && value.length > 0) {
			selections[slot.id] = value;
		}
	}
	return selections;
}

export function parseSlotInstanceId(formData: FormData, slotId: string): string | null {
	const value = formData.get(`slot_${slotId}`);
	return typeof value === 'string' && value.length > 0 ? value : null;
}

async function loadInventoryWithStats(db: ReturnType<typeof getGameDb>, pilotId: string) {
	const stacks = await listPilotResourceStacksWithInstances(db, pilotId);
	const inventory = [];

	for (const stack of stacks) {
		const instance = await getResourceInstanceById(db, stack.resourceInstanceId);
		if (!instance) continue;

		inventory.push({
			resourceInstanceId: stack.resourceInstanceId,
			resourceSlug: stack.resourceSlug,
			displayName: stack.displayName,
			family: stack.family as ResourceFamily,
			quantity: stack.quantity,
			stats: {
				OQ: instance.statOq,
				conductivity: instance.statConductivity,
				hardness: instance.statHardness,
				heat_resistance: instance.statHeatResistance,
				malleability: instance.statMalleability
			}
		});
	}

	return inventory;
}

function buildSlotFills(
	schematic: SchematicDefinition,
	inventory: Awaited<ReturnType<typeof loadInventoryWithStats>>,
	selections: Record<string, string>
): SchematicSlotFill[] | null {
	if (schematic.slots.some((slot) => !selections[slot.id])) {
		return null;
	}

	const fills: SchematicSlotFill[] = [];
	for (const slot of schematic.slots) {
		const stack = inventory.find((row) => row.resourceInstanceId === selections[slot.id]);
		if (!stack || stack.family !== slot.requiredFamily) {
			return null;
		}

		fills.push({
			slotId: slot.id,
			resourceSlug: stack.resourceSlug,
			resourceDisplayName: stack.displayName,
			family: stack.family,
			stats: { ...stack.stats }
		});
	}

	return fills;
}

export async function loadCraftScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL
) {
	const selectedSchematicId =
		url.searchParams.get('schematic') ?? SURVEY_SCANNER_MK_I.id;
	const schematic =
		MVP_SCHEMATIC_BY_ID[selectedSchematicId] ?? SURVEY_SCANNER_MK_I;

	const inventory = await loadInventoryWithStats(db, pilotId);
	const allocationHints = buildResourceAllocationHints(MVP_CRAFT_SCHEMATICS, inventory);
	const slotSelections = parseSlotSelections(schematic, url.searchParams);
	const tuning =
		Object.keys(parseTuningFromParams(schematic, url.searchParams)).length > 0
			? parseTuningFromParams(schematic, url.searchParams)
			: (SUGGESTED_TUNING[schematic.id] ?? {});

	const slotFills = buildSlotFills(schematic, inventory, slotSelections);
	const propertyPreview =
		slotFills !== null ? previewCraftProperties(schematic, slotFills, tuning) : null;

	const tuningTotal = Object.values(tuning).reduce((sum, points) => sum + points, 0);

	const [scannerItems, equippedScanner, thumperPartItems, equippedThumperParts, fieldRepairKitCount] =
		await Promise.all([
			listScannerItemsForPilot(db, pilotId),
			getEquippedScannerForPilot(db, pilotId),
			listThumperPartItemsForPilot(db, pilotId),
			getEquippedThumperPartsForPilot(db, pilotId),
			countFieldRepairKitsForPilot(db, pilotId)
		]);

	return {
		schematics: MVP_CRAFT_SCHEMATICS.map(schematicToCraftUi),
		selectedSchematicId: schematic.id,
		schematic: schematicToCraftUi(schematic),
		inventory,
		veyrithStack: inventory.find((stack) => stack.resourceSlug === 'veyrith_copper') ?? null,
		allocationHints,
		slotSelections,
		tuning,
		tuningTotal,
		propertyPreview,
		suggestedTuning: SUGGESTED_TUNING[schematic.id] ?? {},
		deemphasizedStatsByFamily: {
			conductive_metal: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'conductive_metal'),
			structural_alloy: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'structural_alloy'),
			reactive_crystal: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'reactive_crystal')
		},
		scannerItems: scannerItems.map((item) => ({
			...item,
			surveyClarity: item.propertyScores.survey_clarity ?? 0,
			equipped: equippedScanner?.id === item.id
		})),
		equippedScanner,
		thumperPartItems: thumperPartItems.flatMap((item) => {
			const slot = thumperPartSlotForSchematic(item.schematicId);
			return slot ? [{ ...item, slot }] : [];
		}),
		equippedThumperParts,
		fieldRepairKitCount
	};
}

export { SUGGESTED_TUNING };
