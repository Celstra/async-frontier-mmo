import type { ThumperEventActionId } from './types.js';
import type { ThumperPartSlot } from './thumperPartTypes.js';
import { createSeededRng } from '../rng.js';

/** Player-visible window intensity — hold penalty scales; action wear does not. */
export type EventWindowSeverity = 'minor' | 'serious';

/** @deprecated Use {@link HOLD_PENALTY_RANGES} + meter coupling via holdPenaltyForResponse. */
export const HOLD_PENALTY_BY_SEVERITY: Record<EventWindowSeverity, number> = {
	minor: 5,
	serious: 16
};

/** SIM-LOCKED — event_choice_liveness_sim.py wear lever (was 3). */
export const MATCHING_ACTION_WEAR_CONDITION = 9;

/** Which thumper part takes wear for each matching event action. */
export const MATCHING_ACTION_WEAR_PART_SLOT: Record<
	Exclude<ThumperEventActionId, 'field_repair'>,
	ThumperPartSlot
> = {
	signal_tune: 'drill',
	clear_pump_problem: 'pump',
	suppress_threat: 'hull'
};

export const THUMPER_PART_SLOT_LABEL: Record<ThumperPartSlot, string> = {
	drill: 'Drill',
	pump: 'Pump',
	hull: 'Hull'
};

/** ~40% serious — deterministic from run seed + window index. */
export const SERIOUS_WINDOW_PROBABILITY = 0.4;

export function holdPenaltyForSeverity(severity: EventWindowSeverity): number {
	const [lo, hi] = HOLD_PENALTY_RANGES[severity];
	return Math.round((lo + hi) / 2);
}

import {
	HOLD_PENALTY_RANGES,
	holdPenaltyForResponse,
	holdPenaltyRangeLabel,
	meterLambdaForComplication,
	TUTORIAL_HOLD_PENALTY_BY_SEVERITY
} from './holdPenalty.js';

export function parseEventWindowSeverity(
	value: string | null | undefined
): EventWindowSeverity {
	return value === 'serious' ? 'serious' : 'minor';
}

/**
 * Roll severity for one window. Tutorial runs pass `forceMinor: true` (Decision 011).
 */
export function rollEventWindowSeverity(input: {
	runSeed: string;
	windowIndex: number;
	forceMinor?: boolean;
}): EventWindowSeverity {
	if (input.forceMinor) {
		return 'minor';
	}

	const rng = createSeededRng(`${input.runSeed}:severity:${input.windowIndex}`);
	return rng() < SERIOUS_WINDOW_PROBABILITY ? 'serious' : 'minor';
}
