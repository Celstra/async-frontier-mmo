import type { NamedResourceId } from '../resources/types.js';
import { THUMPER_COMPLICATIONS } from './complicationTable.js';
import {
	COMPLICATION_MATCHING_ACTION,
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES
} from './complicationActions.js';
import { rollEventWindowSeverity } from './eventWindowSeverity.js';
import { createSeededRng } from './seededRng.js';
import {
	EVENT_WINDOW_TRIGGER_PROBABILITY,
	type ThumperComplicationId,
	type ThumperEventWindowPlan,
	type ThumperScheduledWindow
} from './types.js';

export const DEFAULT_RUN_WINDOW_COUNT = 2;
export const PUSH_RUN_WINDOW_COUNT = 3;

/** Base projected recovery before event penalties (non-tutorial default). */
export const DEFAULT_PROJECTED_RECOVERY = 60;

/** Push runs trade higher risk (third window) for higher projected recovery. */
export const PUSH_RUN_PROJECTED_RECOVERY = 80;

export type SeededThumperRunPlan = ThumperEventWindowPlan & {
	runSeed: string;
	isPushRun: boolean;
	windowCount: number;
	projectedRecovery: number;
	/** Number of event windows that actually fire (excludes quiet windows). */
	eventWindowCount: number;
};

function shuffleComplications(
	complications: readonly ThumperComplicationId[],
	rng: () => number
): ThumperComplicationId[] {
	const pool = [...complications];
	const shuffled: ThumperComplicationId[] = [];

	while (pool.length > 0) {
		const index = Math.floor(rng() * pool.length);
		shuffled.push(pool.splice(index, 1)[0]!);
	}

	return shuffled;
}

/**
 * Roll whether a scheduled window actually fires an event.
 * Deterministic from runSeed + windowIndex (owner-approved 2026-06-11).
 */
function rollWindowTriggers(input: {
	runSeed: string;
	windowCount: number;
	triggerProbability: number;
}): boolean[] {
	const rng = createSeededRng(`${input.runSeed}:triggers`);
	return Array.from({ length: input.windowCount }, () => rng() < input.triggerProbability);
}

/**
 * Decision 005/015 — draw event windows from a stored run seed.
 * Pure function: same seed + push flag → same complications, order, and quiet pattern.
 *
 * Owner-approved change (2026-06-11): each window rolls deterministically whether an
 * event actually fires (55% probability). Quiet windows appear in the plan but do
 * NOT create thumper_event_windows DB rows.
 */
export function generateSeededThumperEventWindows(input: {
	runSeed: string;
	targetResourceId: NamedResourceId;
	isPushRun: boolean;
	/** Override default trigger probability for testing. Defaults to EVENT_WINDOW_TRIGGER_PROBABILITY (0.55). */
	triggerProbability?: number;
}): SeededThumperRunPlan {
	const windowCount = input.isPushRun ? PUSH_RUN_WINDOW_COUNT : DEFAULT_RUN_WINDOW_COUNT;
	const triggerProbability = input.triggerProbability ?? EVENT_WINDOW_TRIGGER_PROBABILITY;
	const rng = createSeededRng(input.runSeed);
	const ordered = shuffleComplications(THUMPER_COMPLICATIONS, rng).slice(0, windowCount);

	// Determine which windows trigger an event vs are quiet
	const triggers = rollWindowTriggers({
		runSeed: input.runSeed,
		windowCount,
		triggerProbability
	});

	const windows: ThumperScheduledWindow[] = ordered.map((complication, index) => {
		const windowIndex = index + 1;
		const firesEvent = triggers[index];

		if (!firesEvent) {
			return {
				windowIndex,
				quiet: true
			};
		}

		return {
			windowIndex,
			quiet: false,
			complication,
			matchingAction: COMPLICATION_MATCHING_ACTION[complication],
			severity: rollEventWindowSeverity({ runSeed: input.runSeed, windowIndex })
		};
	});

	const eventWindowCount = windows.filter((w) => !w.quiet).length;

	return {
		runSeed: input.runSeed,
		isPushRun: input.isPushRun,
		windowCount,
		eventWindowCount,
		projectedRecovery: input.isPushRun
			? PUSH_RUN_PROJECTED_RECOVERY
			: DEFAULT_PROJECTED_RECOVERY,
		windows,
		eventActions: THUMPER_EVENT_ACTIONS,
		safetyChoices: THUMPER_SAFETY_CHOICES
	};
}
