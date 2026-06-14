import {
	getResourceInstanceById,
	getPilotTutorialStep,
	getSettlementMilestoneUnlockedAt,
	listPilotResourceStacksWithInstances,
	listThumperPartItemsForPilot
} from '@async-frontier-mmo/db';
import {
	analyzeChassisAssemblyReadiness,
	analyzeSchematicReadiness,
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
	THUMPER_CHASSIS_ASSEMBLY,
	schematicMaterialRollup,
	thumperPartSlotForSchematic,
	type ChassisAssemblyReadiness,
	type CraftMode,
	type ExperimentPulse,
	type ExperimentPushSize,
	type OwnedThumperPart,
	type ResourceFamily,
	type SchematicDefinition,
	type SchematicReadinessAnalysis,
	type SchematicSlotFill,
	type TuningAllocation
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

export const WORKSHOP_SUGGESTED_TUNING: Record<string, TuningAllocation> = {
	[SURVEY_SCANNER_MK_I.id]: FIRST_SCANNER_SUGGESTED_TUNING,
	[FIELD_REPAIR_KIT.id]: FIRST_REPAIR_KIT_SUGGESTED_TUNING,
	[EFFICIENT_PUMP.id]: { recovery_efficiency: 2, clog_resistance: 1, field_stability: 0 },
	[BASIC_DRILL_HEAD.id]: { extraction_rate: 2, depth_access: 1, wear_control: 0 },
	[REINFORCED_HULL_PLATE.id]: { max_condition: 2, damage_reduction: 1, repairability: 0 }
};

export type WorkshopSchematicRow = {
	id: string;
	displayName: string;
	readiness: SchematicReadinessAnalysis;
	craftableNow: boolean;
};

export type WorkshopStation = 'thumper' | 'fabricator';

export type WorkshopScreenData = {
	workshopStation: WorkshopStation;
	tutorialStep: string | null;
	schematics: WorkshopSchematicRow[];
	selectedSchematicId: string | null;
	schematic: ReturnType<typeof schematicToWorkshopUi> | null;
	schematicDefinition: SchematicDefinition | null;
	inventory: Awaited<ReturnType<typeof loadInventoryWithStats>>;
	allocationHints: ReturnType<typeof buildResourceAllocationHints>;
	slotSelections: Record<string, string>;
	tuning: TuningAllocation;
	tuningTotal: number;
	propertyPreview: ReturnType<typeof previewCraftProperties> | null;
	suggestedTuning: TuningAllocation;
	deemphasizedStatsByFamily: Record<ResourceFamily, string[]>;
	schematicReadiness: SchematicReadinessAnalysis;
	showChassisAssembly: boolean;
	chassisAssembly: typeof THUMPER_CHASSIS_ASSEMBLY;
	chassisReadiness: ChassisAssemblyReadiness;
	thumperParts: OwnedThumperPart[];
	chassisSelections: Partial<Record<'hull' | 'drill' | 'pump', string>>;
	rigAssembled: boolean;
	materialRollup: string | null;
};

function defaultWorkshopStation(tutorialStep: string | null): WorkshopStation {
	if (tutorialStep === 'assemble_rig' || tutorialStep === 'first_deploy') {
		return 'thumper';
	}
	return 'fabricator';
}

function parseWorkshopStation(url: URL, tutorialStep: string | null): WorkshopStation {
	const param = url.searchParams.get('station');
	if (param === 'thumper' || param === 'fabricator') {
		return param;
	}
	return defaultWorkshopStation(tutorialStep);
}

export function schematicToWorkshopUi(schematic: SchematicDefinition) {
	return {
		id: schematic.id,
		version: schematic.version,
		displayName: schematic.displayName,
		slots: schematic.slots.map((slot) => ({
			id: slot.id,
			displayName: slot.displayName,
			requiredFamily: slot.requiredFamily,
			inputQuantity: slot.inputQuantity
		})),
		properties: schematic.properties.map((property) => ({
			id: property.id,
			displayName: property.displayName,
			terms: property.terms.map((term) => {
				if (term.kind === 'average_oq') {
					return {
						kind: 'average_oq' as const,
						label: `Average OQ (${Math.round(term.weight * 100)}%)`,
						weightPercent: Math.round(term.weight * 100),
						weight: term.weight
					};
				}

				const slot = schematic.slots.find((row) => row.id === term.slotId);
				return {
					kind: 'slot_stat' as const,
					label: `${slot?.displayName ?? term.slotId} · ${term.stat} (${Math.round(term.weight * 100)}%)`,
					weightPercent: Math.round(term.weight * 100),
					weight: term.weight,
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

const EXPERIMENT_PUSH_SIZES: ExperimentPushSize[] = ['careful', 'standard', 'overdrive'];

export function parseExperimentPulses(
	schematic: SchematicDefinition,
	formData: FormData
): ExperimentPulse[] | null {
	const pulses: ExperimentPulse[] = [];

	for (let index = 0; index < 2; index += 1) {
		const propertyId = String(formData.get(`pulse_${index}_property`));
		const push = String(formData.get(`pulse_${index}_push`)) as ExperimentPushSize;
		const validProperty = schematic.properties.some((property) => property.id === propertyId);
		if (!validProperty || !EXPERIMENT_PUSH_SIZES.includes(push)) {
			return null;
		}
		pulses.push({ propertyId, push });
	}

	return pulses;
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

function parseChassisSelections(
	params: URLSearchParams | FormData
): Partial<Record<'hull' | 'drill' | 'pump', string>> {
	const selections: Partial<Record<'hull' | 'drill' | 'pump', string>> = {};
	for (const slotId of ['hull', 'drill', 'pump'] as const) {
		const value = params.get(`chassis_${slotId}`);
		if (typeof value === 'string' && value.length > 0) {
			selections[slotId] = value;
		}
	}
	return selections;
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

export async function loadWorkshopScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL,
	options?: { rigAssembled?: boolean }
): Promise<WorkshopScreenData> {
	const selectedParam = url.searchParams.get('schematic');
	const fabricatorUnlockedAt = await getSettlementMilestoneUnlockedAt(db, {
		pilotId,
		milestoneKey: 'fabricator_online'
	});
	const showChassisAssembly = fabricatorUnlockedAt !== null;
	const tutorialStep = await getPilotTutorialStep(db, pilotId);
	const workshopStation = parseWorkshopStation(url, tutorialStep);
	const inventory = await loadInventoryWithStats(db, pilotId);
	const thumperPartItems = await listThumperPartItemsForPilot(db, pilotId);
	const ownsReinforcedHull = thumperPartItems.some(
		(part) => part.schematicId === REINFORCED_HULL_PLATE.id
	);

	function defaultSchematicId(): string | null {
		if (showChassisAssembly && tutorialStep === 'assemble_rig') {
			return THUMPER_CHASSIS_ASSEMBLY.id;
		}
		if (tutorialStep === 'first_deploy') {
			return null;
		}
		if ((tutorialStep === 'async_reveal' || tutorialStep === 'done') && !ownsReinforcedHull) {
			return REINFORCED_HULL_PLATE.id;
		}
		return null;
	}

	const fabricatorSchematicId =
		workshopStation === 'fabricator'
			? selectedParam === THUMPER_CHASSIS_ASSEMBLY.id && showChassisAssembly
				? THUMPER_CHASSIS_ASSEMBLY.id
				: selectedParam && MVP_SCHEMATIC_BY_ID[selectedParam]
					? selectedParam
					: defaultSchematicId()
			: null;

	const selectedSchematicId =
		workshopStation === 'thumper' ? THUMPER_CHASSIS_ASSEMBLY.id : fabricatorSchematicId;

	const thumperParts = thumperPartsFromInventory(thumperPartItems);
	const chassisReadiness = analyzeChassisAssemblyReadiness({ ownedParts: thumperParts });
	const chassisSelections = parseChassisSelections(url.searchParams);

	const schematicRows: WorkshopSchematicRow[] = MVP_CRAFT_SCHEMATICS.map((row) => {
		const readiness = analyzeSchematicReadiness({
			schematic: row,
			ownedStacks: inventory.map((stack) => ({
				resourceInstanceId: stack.resourceInstanceId,
				resourceSlug: stack.resourceSlug,
				displayName: stack.displayName,
				family: stack.family,
				quantity: stack.quantity
			}))
		});
		return {
			id: row.id,
			displayName: row.displayName,
			readiness,
			craftableNow: readiness.craftableNow
		};
	});

	if (showChassisAssembly) {
		schematicRows.unshift({
			id: THUMPER_CHASSIS_ASSEMBLY.id,
			displayName: THUMPER_CHASSIS_ASSEMBLY.displayName,
			readiness: {
				slots: [],
				craftableNow: chassisReadiness.assemblableNow,
				blockers: chassisReadiness.blockers
			},
			craftableNow: chassisReadiness.assemblableNow
		});
	}

	const schematicDefinition =
		selectedSchematicId === null
			? null
			: selectedSchematicId === THUMPER_CHASSIS_ASSEMBLY.id
				? SURVEY_SCANNER_MK_I
				: (MVP_SCHEMATIC_BY_ID[selectedSchematicId] ?? null);

	const schematic = schematicDefinition ? schematicToWorkshopUi(schematicDefinition) : null;
	const allocationHints = buildResourceAllocationHints(MVP_CRAFT_SCHEMATICS, inventory);
	const slotSelections =
		schematicDefinition !== null
			? parseSlotSelections(schematicDefinition, url.searchParams)
			: {};
	const tuning =
		schematicDefinition !== null
			? Object.keys(parseTuningFromParams(schematicDefinition, url.searchParams)).length > 0
				? parseTuningFromParams(schematicDefinition, url.searchParams)
				: (WORKSHOP_SUGGESTED_TUNING[schematicDefinition.id] ?? {})
			: {};
	const slotFills =
		schematicDefinition !== null
			? buildSlotFills(schematicDefinition, inventory, slotSelections)
			: null;
	const propertyPreview =
		schematicDefinition !== null && slotFills !== null
			? previewCraftProperties(schematicDefinition, slotFills, tuning)
			: null;
	const tuningTotal = Object.values(tuning).reduce((sum, points) => sum + points, 0);

	const schematicReadiness =
		schematicDefinition !== null
			? analyzeSchematicReadiness({
					schematic: schematicDefinition,
					ownedStacks: inventory.map((stack) => ({
						resourceInstanceId: stack.resourceInstanceId,
						resourceSlug: stack.resourceSlug,
						displayName: stack.displayName,
						family: stack.family,
						quantity: stack.quantity
					}))
				})
			: {
					slots: [],
					craftableNow: false,
					blockers: ['Pick a schematic from the list']
				};

	return {
		workshopStation,
		tutorialStep,
		schematics: schematicRows.filter((row) => row.id !== THUMPER_CHASSIS_ASSEMBLY.id),
		selectedSchematicId:
			workshopStation === 'thumper'
				? THUMPER_CHASSIS_ASSEMBLY.id
				: schematicDefinition?.id ?? null,
		schematic,
		schematicDefinition,
		inventory,
		allocationHints,
		slotSelections,
		tuning,
		tuningTotal,
		propertyPreview,
		suggestedTuning:
			schematicDefinition !== null ? (WORKSHOP_SUGGESTED_TUNING[schematicDefinition.id] ?? {}) : {},
		deemphasizedStatsByFamily: {
			conductive_metal: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'conductive_metal'),
			structural_alloy: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'structural_alloy'),
			reactive_crystal: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'reactive_crystal')
		},
		schematicReadiness,
		showChassisAssembly,
		chassisAssembly: THUMPER_CHASSIS_ASSEMBLY,
		chassisReadiness,
		thumperParts,
		chassisSelections,
		rigAssembled: options?.rigAssembled ?? false,
		materialRollup: schematicDefinition ? schematicMaterialRollup(schematicDefinition) : null
	};
}
