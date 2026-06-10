import type { NamedResourceId } from '../resources/types.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
import {
	DEFAULT_PROJECTED_RECOVERY,
	generateSeededThumperEventWindows,
	type SeededThumperRunPlan
} from './generateSeededThumperEventWindows.js';

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

		return {
			...tutorial,
			runSeed: TUTORIAL_RUN_SEED,
			isPushRun: false,
			windowCount: tutorial.windows.length,
			projectedRecovery: DEFAULT_PROJECTED_RECOVERY
		};
	}

	return generateSeededThumperEventWindows({
		runSeed: input.runSeed,
		targetResourceId: input.targetResourceId,
		isPushRun: input.isPushRun
	});
}
