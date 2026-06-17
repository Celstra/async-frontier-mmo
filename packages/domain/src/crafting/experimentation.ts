import type { ResourceFamily } from '../resources/types.js';
import { createSeededRng } from '../rng.js';
import { getPropertyOutputBand } from './propertyBand.js';
import type {
	CraftPropertyPreview,
	PropertyOutputBand,
	PropertyPreviewLine,
	ResolvedPropertyLine,
	SchematicDefinition,
	SchematicSlotFill
} from './types.js';

/** SIM-LOCKED — experimentation_sim.py (crit_od = 0.25). */
export type ExperimentPushSize = 'careful' | 'standard' | 'overdrive';

export type ExperimentPulse = {
	propertyId: string;
	push: ExperimentPushSize;
};

export type ExperimentPulseOutcome = 'success' | 'wasted' | 'crit_band_loss' | 'crit_scrap';

export type ExperimentPulseResult = {
	pulseIndex: number;
	propertyId: string;
	push: ExperimentPushSize;
	outcome: ExperimentPulseOutcome;
	bandBefore: PropertyOutputBand;
	bandAfter: PropertyOutputBand;
	scrapUnits: number;
};

export function experimentPulseOutcomeLabel(outcome: ExperimentPulseOutcome): string {
	switch (outcome) {
		case 'success':
			return 'SUCCESS';
		case 'wasted':
			return 'WASTED';
		case 'crit_band_loss':
			return 'CRIT: BAND LOST';
		case 'crit_scrap':
			return 'CRIT: MATERIAL SCRAPPED';
	}
}

export function experimentPushDisplayLabel(push: ExperimentPushSize): string {
	switch (push) {
		case 'careful':
			return 'CAREFUL PUSH';
		case 'standard':
			return 'STANDARD PUSH';
		case 'overdrive':
			return 'OVERDRIVE PUSH';
	}
}

export function experimentPushProbabilityText(push: ExperimentPushSize): string {
	switch (push) {
		case 'careful':
			return '+1 band · 90% success · 2% crit';
		case 'standard':
			return '+2 bands · 65% success · 10% crit';
		case 'overdrive':
			return '+3 bands · 40% success · 25% crit scrap';
	}
}

export type ExperimentPulseOutlook = {
	propertyId: string;
	displayName: string;
	push: ExperimentPushSize;
	currentBand: PropertyOutputBand;
	currentScore: number;
	ceilingBand: PropertyOutputBand;
	successRatePercent: number;
	critRatePercent: number;
	wasteRatePercent: number;
	success: {
		band: PropertyOutputBand;
		score: number;
		improvesBand: boolean;
	};
	waste: {
		band: PropertyOutputBand;
		score: number;
	};
	crit:
		| {
				kind: 'band_loss';
				band: PropertyOutputBand;
				score: number;
		  }
		| {
				kind: 'scrap';
				scrapUnits: number;
		  };
};

/** Deterministic preview of what each experiment pulse outcome could do (no RNG). */
export function describeExperimentPulseOutlook(input: {
	schematic: SchematicDefinition;
	line: PropertyPreviewLine;
	push: ExperimentPushSize;
}): ExperimentPulseOutlook {
	const spec = PULSE_SPECS[input.push];
	const currentBand = input.line.tunedBand;
	const currentIndex = bandIndex(currentBand);
	const capIndex = bandIndex(input.line.ceilingBand);

	const successIndex = Math.min(currentIndex + spec.bandDelta, capIndex);
	const successBand = bandFromIndex(successIndex);
	const successScore = Math.max(input.line.tunedScore, scoreForBand(successBand));

	const crit: ExperimentPulseOutlook['crit'] =
		input.push === 'overdrive'
			? {
					kind: 'scrap',
					scrapUnits: largestScrapSocket(input.schematic).scrapUnits
				}
			: (() => {
					const critBand = bandFromIndex(Math.max(1, currentIndex - 1));
					return {
						kind: 'band_loss' as const,
						band: critBand,
						score: scoreForBand(critBand)
					};
				})();

	return {
		propertyId: input.line.propertyId,
		displayName: input.line.displayName,
		push: input.push,
		currentBand,
		currentScore: input.line.tunedScore,
		ceilingBand: input.line.ceilingBand,
		successRatePercent: Math.round(spec.successRate * 100),
		critRatePercent: Math.round(spec.critRate * 100),
		wasteRatePercent: Math.round((1 - spec.successRate - spec.critRate) * 100),
		success: {
			band: successBand,
			score: successScore,
			improvesBand: successIndex > currentIndex
		},
		waste: {
			band: currentBand,
			score: input.line.tunedScore
		},
		crit
	};
}

const PROPERTY_BAND_ORDER: PropertyOutputBand[] = [
	'poor',
	'basic',
	'solid',
	'strong',
	'excellent',
	'exceptional'
];

const PULSE_SPECS: Record<
	ExperimentPushSize,
	{ bandDelta: number; successRate: number; critRate: number }
> = {
	careful: { bandDelta: 1, successRate: 0.9, critRate: 0.02 },
	standard: { bandDelta: 2, successRate: 0.65, critRate: 0.1 },
	overdrive: { bandDelta: 3, successRate: 0.4, critRate: 0.25 }
};

const BAND_MID_SCORE: Record<PropertyOutputBand, number> = {
	poor: 20,
	basic: 47,
	solid: 62,
	strong: 77,
	excellent: 90,
	exceptional: 97
};

function bandIndex(band: PropertyOutputBand): number {
	const index = PROPERTY_BAND_ORDER.indexOf(band);
	return index >= 0 ? index + 1 : 1;
}

function bandFromIndex(index: number): PropertyOutputBand {
	const clamped = Math.max(1, Math.min(PROPERTY_BAND_ORDER.length, index));
	return PROPERTY_BAND_ORDER[clamped - 1]!;
}

function scoreForBand(band: PropertyOutputBand): number {
	return BAND_MID_SCORE[band];
}

export function largestScrapSocket(schematic: SchematicDefinition): {
	slotId: string;
	scrapUnits: number;
} {
	const slot = schematic.slots.reduce((largest, current) =>
		current.inputQuantity > largest.inputQuantity ? current : largest
	);
	return { slotId: slot.id, scrapUnits: slot.inputQuantity };
}

export function largestSocketScrapUnits(schematic: SchematicDefinition): number {
	return largestScrapSocket(schematic).scrapUnits;
}

export function schematicMaterialRollup(schematic: SchematicDefinition): string | null {
	if (schematic.id !== 'reinforced_hull_plate') {
		return null;
	}

	const totals = new Map<ResourceFamily, number>();
	for (const slot of schematic.slots) {
		totals.set(slot.requiredFamily, (totals.get(slot.requiredFamily) ?? 0) + slot.inputQuantity);
	}

	const sa = totals.get('structural_alloy') ?? 0;
	const rc = totals.get('reactive_crystal') ?? 0;
	return `Needs ${sa} Structural Alloy + ${rc} Reactive Crystal total`;
}

function applySinglePulse(input: {
	random: () => number;
	line: PropertyPreviewLine;
	push: ExperimentPushSize;
	schematic: SchematicDefinition;
}): {
	line: PropertyPreviewLine;
	outcome: ExperimentPulseOutcome;
	scrapUnits: number;
} {
	const spec = PULSE_SPECS[input.push];
	const bandBefore = getPropertyOutputBand(input.line.tunedScore);
	const capIndex = bandIndex(input.line.ceilingBand);
	let currentIndex = bandIndex(bandBefore);
	let scrapUnits = 0;

	const roll = input.random();
	if (roll < spec.successRate) {
		currentIndex = Math.min(currentIndex + spec.bandDelta, capIndex);
		const bandAfter = bandFromIndex(currentIndex);
		const tunedScore = Math.max(input.line.tunedScore, scoreForBand(bandAfter));
		return {
			line: {
				...input.line,
				tunedScore,
				tunedBand: bandAfter
			},
			outcome: 'success',
			scrapUnits
		};
	}

	if (roll < spec.successRate + spec.critRate) {
		if (input.push === 'overdrive') {
			scrapUnits = largestScrapSocket(input.schematic).scrapUnits;
			return {
				line: input.line,
				outcome: 'crit_scrap',
				scrapUnits
			};
		}

		currentIndex = Math.max(1, currentIndex - 1);
		const bandAfter = bandFromIndex(currentIndex);
		return {
			line: {
				...input.line,
				tunedScore: scoreForBand(bandAfter),
				tunedBand: bandAfter
			},
			outcome: 'crit_band_loss',
			scrapUnits
		};
	}

	return {
		line: input.line,
		outcome: 'wasted',
		scrapUnits
	};
}

export function resolveExperimentationPulses(input: {
	preview: CraftPropertyPreview;
	schematic: SchematicDefinition;
	slotFills: SchematicSlotFill[];
	pulses: ExperimentPulse[];
	experimentSeed: string;
}): {
	lines: ResolvedPropertyLine[];
	pulseResults: ExperimentPulseResult[];
	totalScrapUnits: number;
} {
	if (input.pulses.length !== 2) {
		throw new Error('Experimentation requires exactly 2 pulses');
	}

	const random = createSeededRng(input.experimentSeed);
	const lineState = new Map(
		input.preview.lines.map((line) => [line.propertyId, { ...line }] as const)
	);
	const pulseResults: ExperimentPulseResult[] = [];
	let totalScrapUnits = 0;

	input.pulses.forEach((pulse, pulseIndex) => {
		const line = lineState.get(pulse.propertyId);
		if (!line) {
			throw new Error(`Unknown property line: ${pulse.propertyId}`);
		}

		const bandBefore = getPropertyOutputBand(line.tunedScore);
		const result = applySinglePulse({
			random,
			line,
			push: pulse.push,
			schematic: input.schematic
		});

		if (result.outcome === 'success' || result.outcome === 'crit_band_loss') {
			lineState.set(pulse.propertyId, result.line);
		}

		totalScrapUnits += result.scrapUnits;
		const bandAfter = getPropertyOutputBand(lineState.get(pulse.propertyId)!.tunedScore);

		pulseResults.push({
			pulseIndex,
			propertyId: pulse.propertyId,
			push: pulse.push,
			outcome: result.outcome,
			bandBefore,
			bandAfter,
			scrapUnits: result.scrapUnits
		});
	});

	const lines: ResolvedPropertyLine[] = input.preview.lines.map((line) => {
		const state = lineState.get(line.propertyId) ?? line;
		const finalScore = state.tunedScore;
		return {
			...line,
			tunedScore: finalScore,
			tunedBand: getPropertyOutputBand(finalScore),
			finalScore,
			finalBand: getPropertyOutputBand(finalScore)
		};
	});

	return { lines, pulseResults, totalScrapUnits };
}
