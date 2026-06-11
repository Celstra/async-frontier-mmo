import type { ThumperPartSnapshot, ThumperPartSlot } from './thumperPartTypes.js';

export type ThumperConditionBand = 'Solid' | 'Worn' | 'Failing';

export type OverallThumperCondition = {
	/** Overall condition as percentage (weighted toward weakest part). */
	percent: number;
	/** Which slot has the lowest condition. */
	weakestSlot: ThumperPartSlot;
	/** The condition percentage of the weakest part. */
	weakestPercent: number;
	/** Human-readable band label. */
	band: ThumperConditionBand;
	/** Descriptive line for UI display. */
	displayLine: string;
};

const CONDITION_BANDS: { threshold: number; label: ThumperConditionBand }[] = [
	{ threshold: 70, label: 'Solid' },
	{ threshold: 40, label: 'Worn' },
	{ threshold: 0, label: 'Failing' }
];

function getConditionBand(percent: number): ThumperConditionBand {
	for (const band of CONDITION_BANDS) {
		if (percent >= band.threshold) {
			return band.label;
		}
	}
	return 'Failing';
}

/**
 * Calculate overall thumper condition from part snapshots.
 *
 * Formula: weighted average that emphasizes the weakest part (the chain is only
 * as strong as its weakest link). This makes the overall condition more
 * conservative than a simple average.
 *
 * Weights: Drill 35%, Pump 35%, Hull 30% (hull is slightly less weighted since
 * it's the part most likely to be damaged during events).
 */
const SLOT_WEIGHTS: Record<ThumperPartSlot, number> = {
	drill: 0.35,
	pump: 0.35,
	hull: 0.30
};

/**
 * Compute overall thumper condition from equipped part snapshots.
 *
 * Used in run screen header, claim summary, and inventory/gear views.
 * Returns display-friendly values including band labels and a ready-to-use
 * display line.
 */
export function overallThumperCondition(
	parts: Partial<Record<ThumperPartSlot, ThumperPartSnapshot>>
): OverallThumperCondition {
	const slots: ThumperPartSlot[] = ['drill', 'pump', 'hull'];

	// Get condition values (default to 100 for missing parts, but mark as weak)
	const conditions: Record<ThumperPartSlot, number> = {
		drill: parts.drill?.condition ?? 100,
		pump: parts.pump?.condition ?? 100,
		hull: parts.hull?.condition ?? 100
	};

	// Find weakest slot
	let weakestSlot: ThumperPartSlot = 'drill';
	let weakestPercent = conditions.drill;

	for (const slot of slots) {
		if (conditions[slot] < weakestPercent) {
			weakestPercent = conditions[slot];
			weakestSlot = slot;
		}
	}

	// Calculate weighted average with extra weight on weakest part
	// This makes the overall more conservative than simple average
	const weightedSum = slots.reduce((sum, slot) => {
		const weight = slot === weakestSlot ? SLOT_WEIGHTS[slot] * 1.5 : SLOT_WEIGHTS[slot];
		return sum + conditions[slot] * weight;
	}, 0);

	// Normalize weights (weakest slot got 1.5x weight)
	const totalWeight = slots.reduce((sum, slot) => {
		return sum + (slot === weakestSlot ? SLOT_WEIGHTS[slot] * 1.5 : SLOT_WEIGHTS[slot]);
	}, 0);

	const percent = Math.round(weightedSum / totalWeight);
	const band = getConditionBand(percent);

	// Format display line
	const weakestSlotLabel =
		weakestSlot === 'drill' ? 'Drill' : weakestSlot === 'pump' ? 'Pump' : 'Hull';

	return {
		percent,
		weakestSlot,
		weakestPercent,
		band,
		displayLine: `${percent}% (${band}) — weakest: ${weakestSlotLabel} ${weakestPercent}%`
	};
}

/**
 * Get condition band for a single percentage value.
 * Useful for displaying part condition without computing overall.
 */
export function getPartConditionBand(percent: number): ThumperConditionBand {
	return getConditionBand(percent);
}

/**
 * Get CSS color class for condition band.
 * Useful for consistent styling across the UI.
 */
export function getConditionColorClass(band: ThumperConditionBand): string {
	switch (band) {
		case 'Solid':
			return 'condition--solid';
		case 'Worn':
			return 'condition--worn';
		case 'Failing':
			return 'condition--failing';
		default:
			return 'condition--solid';
	}
}
