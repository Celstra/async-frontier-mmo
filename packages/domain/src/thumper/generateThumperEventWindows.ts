import type { NamedResourceId } from '../resources/types.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
import {
	generateSeededThumperEventWindows,
	type SeededThumperRunPlan
} from './generateSeededThumperEventWindows.js';
import { FIRST_SESSION_PROJECTED_RECOVERY } from './resolveFirstSessionThumperRunResult.js';

export const TUTORIAL_RUN_SEED = 'first-session-scripted';

export type ThumperRunWindowPlan = SeededThumperRunPlan;

/**
 * Route tutorial vs seeded generation. Tutorial runs ignore push and use Decision 011 script.
 */
export function generateThumperEventWindows(input: {
	targetResourceId: NamedResourceId;
	runSeed: string;
	isPushRun: boolean;
	isTutorialRun: boolean;
}): ThumperRunWindowPlan {
	if (input.isTutorialRun) {
		if (input.isPushRun) {
			throw new Error('Tutorial runs do not support push mode');
		}

		const tutorial = generateFirstSessionEventWindows({
			targetResourceId: input.targetResourceId
		});

		// Tutorial has no quiet windows (100% trigger rate)
		const eventWindowCount = tutorial.windows.length;

		return {
			...tutorial,
			runSeed: TUTORIAL_RUN_SEED,
			isPushRun: false,
			windowCount: tutorial.windows.length,
			eventWindowCount,
			projectedRecovery: FIRST_SESSION_PROJECTED_RECOVERY
		};
	}

	return generateSeededThumperEventWindows({
		runSeed: input.runSeed,
		targetResourceId: input.targetResourceId,
		isPushRun: input.isPushRun
	});
}
