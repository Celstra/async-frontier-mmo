import type { ThumperEventActionId } from './types.js';
import type { ThumperPartSlot } from './thumperPartTypes.js';
import { createSeededRng } from '../rng.js';

/** Player-visible window intensity — hold penalty scales; action wear does not. */
export type EventWindowSeverity = 'minor' | 'serious';

/** Fixed hold/ignore recovery loss per severity (BUILD_PLAN §14 tunable). */
export const HOLD_PENALTY_BY_SEVERITY: Record<EventWindowSeverity, number> = {
	minor: 5,
	serious: 16
};

/** Condition wear when the matching action is used (field_repair excluded — kit cost only). */
export const MATCHING_ACTION_WEAR_CONDITION = 3;

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
	return HOLD_PENALTY_BY_SEVERITY[severity];
}

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
