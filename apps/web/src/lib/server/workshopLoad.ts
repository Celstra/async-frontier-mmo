import {
	getPilotWorkshopState,
	hasAnyCompletedWorkshopCraft,
	listPilotWorkshopBenchStacksWithInstances,
	listWorkshopCraftedItemsForPilot,
	listWorkshopCratesForPilot
} from '@async-frontier-mmo/db';
import {
	analyzeSchematicReadiness,
	BASIC_DRILL_HEAD,
	canCraftAnyWorkshopThumperPart,
	deemphasizedStatsForSlotFamily,
	EFFICIENT_PUMP,
	getStatBand,
	getWorkshopBenchResource,
	isWorkshopActiveSchematic,
	isWorkshopChassisAssemblyEnabled,
	isWorkshopStationEnabled,
	pickBestWorkshopCraftItem,
	previewWorkshopItemReclaimFromProvenance,
	previewCraftProperties,
	REINFORCED_HULL_PLATE,
	schematicMaterialRollup,
	scoreWorkshopCraftItem,
	WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS,
	WORKSHOP_CRAFT_COUNT_CRATE_INTERVAL,
	WORKSHOP_TIMER_CRATE_MINUTES,
	type CraftMode,
	type ExperimentPulse,
	type ExperimentPushSize,
	type ResourceFamily,
	type NamedResourceId,
	type SchematicDefinition,
	type SchematicReadinessAnalysis,
	type SchematicSlotFill,
	type TuningAllocation,
	type WorkshopSupplyCrateReason
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

export const WORKSHOP_SUGGESTED_TUNING: Record<string, TuningAllocation> = {
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

export type WorkshopCraftHistoryEntry = {
	itemId: string;
	schematicId: string;
	displayName: string;
	favorited: boolean;
	createdAt: string;
	totalScore: number;
	propertyScores: Record<string, number>;
	condition: number;
	integrity: number;
	reclaimPreview: Array<{
		resourceSlug: string;
		resourceDisplayName: string;
		quantity: number;
	}>;
};

export type WorkshopSchematicCraftHistory = {
	schematicId: string;
	displayName: string;
	lastCraft: WorkshopCraftHistoryEntry | null;
	bestCraft: WorkshopCraftHistoryEntry | null;
	crafts: WorkshopCraftHistoryEntry[];
};

export type WorkshopStation = 'thumper' | 'fabricator';

export type WorkshopCratePayloadLineUi = {
	resourceSlug: string;
	displayName: string;
	quantity: number;
	family: string;
	stats: Array<{ key: string; value: number; band: string }>;
};

export type WorkshopSupplyCrateUi = {
	id: string;
	reason: WorkshopSupplyCrateReason;
	reasonLabel: string;
	sequence: number;
	availableAt: string;
	payload: WorkshopCratePayloadLineUi[];
};

export type WorkshopSupplyState = {
	nextTimedCrateAt: string | null;
	timerCrateMinutes: number;
	craftCountSinceCrate: number;
	craftCountCrateInterval: number;
	availableCrates: WorkshopSupplyCrateUi[];
	canCraftAnyThumperPart: boolean;
};

export type WorkshopScreenData = {
	workshopStation: WorkshopStation;
	showChassisStation: boolean;
	schematics: WorkshopSchematicRow[];
	selectedSchematicId: string | null;
	schematic: ReturnType<typeof schematicToWorkshopUi> | null;
	schematicDefinition: SchematicDefinition | null;
	inventory: Awaited<ReturnType<typeof loadInventoryWithStats>>;
	slotSelections: Record<string, string>;
	tuning: TuningAllocation;
	tuningTotal: number;
	propertyPreview: ReturnType<typeof previewCraftProperties> | null;
	suggestedTuning: TuningAllocation;
	deemphasizedStatsByFamily: Record<ResourceFamily, string[]>;
	schematicReadiness: SchematicReadinessAnalysis;
	materialRollup: string | null;
	craftHistoryBySchematic: Record<string, WorkshopSchematicCraftHistory>;
	selectedCraftHistory: WorkshopSchematicCraftHistory | null;
	/** Sticky unlock — true after any completed craft attempt, even if prototypes were reclaimed. */
	hasCraftedAnyWorkshopPrototype: boolean;
	supply: WorkshopSupplyState;
};

function parseWorkshopStation(url: URL): WorkshopStation {
	const param = url.searchParams.get('station');
	if (param === 'thumper' && isWorkshopStationEnabled('thumper')) {
		return 'thumper';
	}
	return 'fabricator';
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

async function loadInventoryWithStats(db: ReturnType<typeof getGameDb>, pilotId: string) {
	const stacks = await listPilotWorkshopBenchStacksWithInstances(db, pilotId);

	return stacks.map((stack) => ({
		resourceInstanceId: stack.resourceInstanceId,
		resourceSlug: stack.resourceSlug,
		displayName: stack.displayName,
		family: stack.family as ResourceFamily,
		quantity: stack.quantity,
		stats: {
			OQ: stack.statOq,
			conductivity: stack.statConductivity,
			hardness: stack.statHardness,
			heat_resistance: stack.statHeatResistance,
			malleability: stack.statMalleability
		}
	}));
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

function schematicById(schematicId: string): SchematicDefinition | null {
	return (
		WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS.find((row) => row.id === schematicId) ?? null
	);
}

function itemRowToHistoryEntry(
	schematic: SchematicDefinition,
	row: Awaited<ReturnType<typeof listWorkshopCraftedItemsForPilot>>[number]
): WorkshopCraftHistoryEntry {
	return {
		itemId: row.id,
		schematicId: row.schematicId,
		displayName: row.displayName,
		favorited: row.favoritedAt !== null,
		createdAt: row.createdAt.toISOString(),
		totalScore: scoreWorkshopCraftItem(schematic, row.propertyScores),
		propertyScores: row.propertyScores,
		condition: row.condition,
		integrity: row.integrity,
		reclaimPreview: previewWorkshopItemReclaimFromProvenance(
		row.provenance.map((line) => ({
			resourceInstanceId: line.resourceInstanceId,
			resourceSlug: line.resourceSlug as NamedResourceId,
			resourceDisplayName: line.resourceDisplayName,
			quantityConsumed: line.quantityConsumed
		}))
		).map((line) => ({
			resourceSlug: line.resourceSlug,
			resourceDisplayName: line.resourceDisplayName,
			quantity: line.quantity
		}))
	};
}

async function loadCraftHistoryBySchematic(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<Record<string, WorkshopSchematicCraftHistory>> {
	const rows = await listWorkshopCraftedItemsForPilot(db, pilotId);
	const rowsBySchematic = new Map<string, typeof rows>();

	for (const row of rows) {
		const bucket = rowsBySchematic.get(row.schematicId) ?? [];
		bucket.push(row);
		rowsBySchematic.set(row.schematicId, bucket);
	}

	const historyBySchematic: Record<string, WorkshopSchematicCraftHistory> = {};

	for (const schematic of WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS) {
		const schematicRows = rowsBySchematic.get(schematic.id) ?? [];
		const crafts = schematicRows.map((row) => itemRowToHistoryEntry(schematic, row));
		const bestRow = pickBestWorkshopCraftItem(schematic, schematicRows);

		historyBySchematic[schematic.id] = {
			schematicId: schematic.id,
			displayName: schematic.displayName,
			lastCraft: crafts[0] ?? null,
			bestCraft: bestRow ? itemRowToHistoryEntry(schematic, bestRow) : null,
			crafts
		};
	}

	return historyBySchematic;
}

const SUPPLY_CRATE_REASON_LABELS: Record<WorkshopSupplyCrateReason, string> = {
	timer: 'Timed resupply',
	craft_count: 'Craft milestone resupply',
	emergency: 'Emergency anti-stuck resupply',
	starter: 'Starter resupply'
};

const STAT_LABELS: Record<string, string> = {
	OQ: 'OQ',
	conductivity: 'Conductivity',
	hardness: 'Hardness',
	heat_resistance: 'Heat resistance',
	malleability: 'Malleability'
};

function cratePayloadToUi(
	payload: Awaited<ReturnType<typeof listWorkshopCratesForPilot>>[number]['payload']
): WorkshopCratePayloadLineUi[] {
	return payload.map((line) => {
		const definition = getWorkshopBenchResource(line.resourceSlug as NamedResourceId);
		return {
			resourceSlug: line.resourceSlug,
			displayName: definition.displayName,
			quantity: line.quantity,
			family: definition.family,
			stats: Object.entries(definition.stats).map(([key, value]) => ({
				key: STAT_LABELS[key] ?? key,
				value,
				band: getStatBand(value)
			}))
		};
	});
}

async function loadWorkshopSupplyState(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	inventory: Awaited<ReturnType<typeof loadInventoryWithStats>>
): Promise<WorkshopSupplyState> {
	const [state, crates] = await Promise.all([
		getPilotWorkshopState(db, pilotId),
		listWorkshopCratesForPilot(db, pilotId, 'available')
	]);

	const ownedStacks = inventory.map((stack) => ({
		resourceInstanceId: stack.resourceInstanceId,
		resourceSlug: stack.resourceSlug,
		displayName: stack.displayName,
		family: stack.family,
		quantity: stack.quantity
	}));

	return {
		nextTimedCrateAt: state?.nextTimedCrateAt?.toISOString() ?? null,
		timerCrateMinutes: WORKSHOP_TIMER_CRATE_MINUTES,
		craftCountSinceCrate: state?.craftCountSinceCrate ?? 0,
		craftCountCrateInterval: WORKSHOP_CRAFT_COUNT_CRATE_INTERVAL,
		canCraftAnyThumperPart: canCraftAnyWorkshopThumperPart(ownedStacks),
		availableCrates: crates.map((crate) => ({
			id: crate.id,
			reason: crate.reason,
			reasonLabel: SUPPLY_CRATE_REASON_LABELS[crate.reason],
			sequence: crate.sequence,
			availableAt: crate.availableAt.toISOString(),
			payload: cratePayloadToUi(crate.payload)
		}))
	};
}

export function schematicByIdFromActiveSlice(schematicId: string): SchematicDefinition | null {
	return schematicById(schematicId);
}

export async function loadWorkshopScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL
): Promise<WorkshopScreenData> {
	const showChassisStation = isWorkshopChassisAssemblyEnabled();
	const workshopStation = parseWorkshopStation(url);
	const inventory = await loadInventoryWithStats(db, pilotId);

	const selectedParam = url.searchParams.get('schematic');
	const selectedSchematicId =
		workshopStation === 'fabricator' &&
		selectedParam &&
		isWorkshopActiveSchematic(selectedParam)
			? selectedParam
			: null;

	const schematicRows: WorkshopSchematicRow[] = WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS.map(
		(row) => {
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
		}
	);

	const schematicDefinition = selectedSchematicId ? schematicById(selectedSchematicId) : null;
	const schematic = schematicDefinition ? schematicToWorkshopUi(schematicDefinition) : null;
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

	const craftHistoryBySchematic = await loadCraftHistoryBySchematic(db, pilotId);
	const hasCraftedAnyWorkshopPrototype = await hasAnyCompletedWorkshopCraft(db, pilotId);
	const selectedCraftHistory = schematicDefinition
		? (craftHistoryBySchematic[schematicDefinition.id] ?? null)
		: null;
	const supply = await loadWorkshopSupplyState(db, pilotId, inventory);

	return {
		workshopStation,
		showChassisStation,
		schematics: schematicRows,
		selectedSchematicId: schematicDefinition?.id ?? null,
		schematic,
		schematicDefinition,
		inventory,
		slotSelections,
		tuning,
		tuningTotal,
		propertyPreview,
		suggestedTuning:
			schematicDefinition !== null
				? (WORKSHOP_SUGGESTED_TUNING[schematicDefinition.id] ?? {})
				: {},
		deemphasizedStatsByFamily: {
			conductive_metal: deemphasizedStatsForSlotFamily(
				[...WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS],
				'conductive_metal'
			),
			structural_alloy: deemphasizedStatsForSlotFamily(
				[...WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS],
				'structural_alloy'
			),
			reactive_crystal: deemphasizedStatsForSlotFamily(
				[...WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS],
				'reactive_crystal'
			)
		},
		schematicReadiness,
		materialRollup: schematicDefinition ? schematicMaterialRollup(schematicDefinition) : null,
		craftHistoryBySchematic,
		selectedCraftHistory,
		hasCraftedAnyWorkshopPrototype,
		supply
	};
}
