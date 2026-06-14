import { resolveExperimentationPulses, type ExperimentPulse } from './experimentation.js';
import { getPropertyOutputBand } from './propertyBand.js';
import type {
	CraftMode,
	CraftPropertyPreview,
	CraftResolution,
	ResolvedPropertyLine,
	SchematicDefinition,
	SchematicSlotFill,
	SchematicWeightTerm,
	TuningAllocation
} from './types.js';

export const TUNING_POINTS_TOTAL = 3;
export const TUNING_BOOST_PER_POINT = 0.05;
export const CAREFUL_EXPERIMENT_BOOST = 0.03;
export const CAREFUL_EXPERIMENT_BOOST_CHANCE = 0.75;
export const CAREFUL_EXPERIMENT_UNCHANGED_CHANCE = 0.2;
export const CAREFUL_EXPERIMENT_FLAW_CHANCE = 0.05;
export const PROPERTY_SCORE_CAP = 100;

export class TuningValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'TuningValidationError';
	}
}

export class SchematicSlotValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'SchematicSlotValidationError';
	}
}

function roundScore(value: number): number {
	return Math.round(value * 1000) / 1000;
}

function capPropertyScore(value: number): number {
	return Math.min(PROPERTY_SCORE_CAP, roundScore(value));
}

/** Resource-defined ceiling: all 3 tuning points on one line (+15% relative), capped at 100. */
export function getResourcePropertyCeiling(baseScore: number): number {
	return capPropertyScore(baseScore * (1 + TUNING_BOOST_PER_POINT * TUNING_POINTS_TOTAL));
}

function averageOq(slotFills: SchematicSlotFill[]): number {
	if (slotFills.length === 0) {
		throw new SchematicSlotValidationError('At least one slot fill is required');
	}
	const total = slotFills.reduce((sum, fill) => sum + fill.stats.OQ, 0);
	return total / slotFills.length;
}

function evaluateWeightTerm(term: SchematicWeightTerm, slotFills: SchematicSlotFill[]): number {
	if (term.kind === 'average_oq') {
		return averageOq(slotFills) * term.weight;
	}

	const fill = slotFills.find((candidate) => candidate.slotId === term.slotId);
	if (!fill) {
		throw new SchematicSlotValidationError(`Missing slot fill for "${term.slotId}"`);
	}

	return fill.stats[term.stat] * term.weight;
}

function computeWeightedTotal(
	terms: SchematicWeightTerm[],
	slotFills: SchematicSlotFill[]
): number {
	return terms.reduce((sum, term) => sum + evaluateWeightTerm(term, slotFills), 0);
}

/** Decision 010: base = weighted_resource_stat_total / 10 */
export function computePropertyBaseScore(
	terms: SchematicWeightTerm[],
	slotFills: SchematicSlotFill[]
): number {
	return roundScore(computeWeightedTotal(terms, slotFills) / 10);
}

/** Decision 010: tuned = base × (1 + 0.05 × points_on_line), cap 100 */
export function computeTunedPropertyScore(baseScore: number, tuningPoints: number): number {
	return capPropertyScore(baseScore * (1 + TUNING_BOOST_PER_POINT * tuningPoints));
}

export function validateSchematicSlotFills(
	schematic: SchematicDefinition,
	slotFills: SchematicSlotFill[]
): void {
	if (slotFills.length !== schematic.slots.length) {
		throw new SchematicSlotValidationError('Slot fill count does not match schematic slots');
	}

	for (const slot of schematic.slots) {
		const fill = slotFills.find((candidate) => candidate.slotId === slot.id);
		if (!fill) {
			throw new SchematicSlotValidationError(`Missing slot fill for "${slot.id}"`);
		}

		if (fill.family !== slot.requiredFamily) {
			throw new SchematicSlotValidationError(
				`Slot "${slot.id}" requires family "${slot.requiredFamily}", got "${fill.family}" (${fill.resourceSlug})`
			);
		}
	}
}

export function validateTuningAllocation(
	schematic: SchematicDefinition,
	tuning: TuningAllocation,
	options: { requireExact?: boolean } = {}
): void {
	let total = 0;

	for (const [propertyId, points] of Object.entries(tuning)) {
		if (!Number.isInteger(points) || points < 0) {
			throw new TuningValidationError(`Tuning points must be non-negative integers, got ${points}`);
		}

		const line = schematic.properties.find((property) => property.id === propertyId);
		if (!line) {
			throw new TuningValidationError(`Unknown property "${propertyId}"`);
		}

		total += points;
	}

	if (total > TUNING_POINTS_TOTAL) {
		throw new TuningValidationError(
			`Tuning allocation exceeds ${TUNING_POINTS_TOTAL} points (got ${total})`
		);
	}

	if (options.requireExact && total !== TUNING_POINTS_TOTAL) {
		throw new TuningValidationError(
			`Craft requires exactly ${TUNING_POINTS_TOTAL} tuning points (got ${total})`
		);
	}
}

/** Strict tuning validation for craft commit — preview may use partial allocation. */
export function validateCraftTuningAllocation(
	schematic: SchematicDefinition,
	tuning: TuningAllocation
): void {
	validateTuningAllocation(schematic, tuning, { requireExact: true });
}

function tuningPointsForProperty(tuning: TuningAllocation, propertyId: string): number {
	return tuning[propertyId] ?? 0;
}

/**
 * Pure property preview for UI before craft commit.
 * Does not mutate slot fill stats.
 */
export function previewCraftProperties(
	schematic: SchematicDefinition,
	slotFills: SchematicSlotFill[],
	tuning: TuningAllocation = {}
): CraftPropertyPreview {
	validateSchematicSlotFills(schematic, slotFills);
	validateTuningAllocation(schematic, tuning);

	const lines = schematic.properties.map((property) => {
		const baseScore = computePropertyBaseScore(property.terms, slotFills);
		const points = tuningPointsForProperty(tuning, property.id);
		const tunedScore = computeTunedPropertyScore(baseScore, points);
		const resourceCeiling = getResourcePropertyCeiling(baseScore);

		return {
			propertyId: property.id,
			displayName: property.displayName,
			baseScore,
			tunedScore,
			resourceCeiling,
			tunedBand: getPropertyOutputBand(tunedScore),
			ceilingBand: getPropertyOutputBand(resourceCeiling)
		};
	});

	return {
		schematicId: schematic.id,
		schematicVersion: schematic.version,
		lines
	};
}

export type ResolveCraftInput = {
	schematic: SchematicDefinition;
	slotFills: SchematicSlotFill[];
	tuning: TuningAllocation;
	mode: CraftMode;
	/** Required for careful_experiment — same seed → same outcome (audit/replay). */
	experimentSeed?: string;
	/** Two pulses for careful_experiment (Decision 023 bet-sizing). */
	experimentPulses?: ExperimentPulse[];
};

/**
 * Resolves a craft attempt from preview math + mode.
 * Safe Craft returns tuned scores. Careful Experiment applies bounded variance.
 */
export function resolveCraft(input: ResolveCraftInput): CraftResolution {
	validateCraftTuningAllocation(input.schematic, input.tuning);
	const preview = previewCraftProperties(input.schematic, input.slotFills, input.tuning);

	if (input.mode === 'safe_craft') {
		return {
			mode: input.mode,
			lines: preview.lines.map((line) => ({
				...line,
				finalScore: line.tunedScore,
				finalBand: line.tunedBand
			})),
			hasMinorFlaw: false
		};
	}

	const defaultPulses: ExperimentPulse[] = input.schematic.properties.slice(0, 2).map(
		(property, index) => ({
			propertyId: property.id,
			push: index === 0 ? 'careful' : 'standard'
		})
	);
	const pulses =
		input.experimentPulses && input.experimentPulses.length === 2
			? input.experimentPulses
			: defaultPulses;

	const experimented = resolveExperimentationPulses({
		preview,
		schematic: input.schematic,
		slotFills: input.slotFills,
		pulses,
		experimentSeed: input.experimentSeed ?? 'experiment-default'
	});

	return {
		mode: input.mode,
		lines: experimented.lines,
		hasMinorFlaw: experimented.pulseResults.some(
			(result) => result.outcome === 'crit_band_loss' || result.outcome === 'crit_scrap'
		),
		experimentPulseResults: experimented.pulseResults,
		experimentScrapUnits: experimented.totalScrapUnits
	};
}
