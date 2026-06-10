import type { NamedResourceId } from '../resources/types.js';
import { THUMPER_COMPLICATIONS } from './complicationTable.js';
import {
	COMPLICATION_MATCHING_ACTION,
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES
} from './complicationActions.js';
import { createSeededRng } from './seededRng.js';
import type { ThumperComplicationId, ThumperEventWindowPlan } from './types.js';

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
 * Decision 005/015 — draw event windows from a stored run seed.
 * Pure function: same seed + push flag → same complications and order.
 */
export function generateSeededThumperEventWindows(input: {
	runSeed: string;
	targetResourceId: NamedResourceId;
	isPushRun: boolean;
}): SeededThumperRunPlan {
	const windowCount = input.isPushRun ? PUSH_RUN_WINDOW_COUNT : DEFAULT_RUN_WINDOW_COUNT;
	const rng = createSeededRng(input.runSeed);
	const ordered = shuffleComplications(THUMPER_COMPLICATIONS, rng).slice(0, windowCount);

	const windows = ordered.map((complication, index) => ({
		windowIndex: index + 1,
		complication,
		matchingAction: COMPLICATION_MATCHING_ACTION[complication]
	}));

	return {
		runSeed: input.runSeed,
		isPushRun: input.isPushRun,
		windowCount,
		projectedRecovery: input.isPushRun
			? PUSH_RUN_PROJECTED_RECOVERY
			: DEFAULT_PROJECTED_RECOVERY,
		windows,
		eventActions: THUMPER_EVENT_ACTIONS,
		safetyChoices: THUMPER_SAFETY_CHOICES
	};
}
