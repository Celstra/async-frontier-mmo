import type { NamedResourceId } from '../resources/types.js';
import {
	generateSeededThumperEventWindows,
	type SeededThumperRunPlan
} from './generateSeededThumperEventWindows.js';
import { generateTutorialEventWindows } from './tutorialEventWindows.js';
import {
	tutorialRunSeed,
	type TutorialThumperRun
} from './tutorialThumperRuns.js';

export {
	TUTORIAL_RUN_1_SEED,
	TUTORIAL_RUN_2_SEED,
	TUTORIAL_RUN_SEED,
	tutorialDeployForStep,
	tutorialRunFromSeed,
	tutorialRunSeed,
	isTutorialRunSeed,
	isScriptedTutorialDeployStep,
	type TutorialThumperRun
} from './tutorialThumperRuns.js';

export type ThumperRunWindowPlan = SeededThumperRunPlan;

/**
 * Route tutorial vs seeded generation. Tutorial runs use slice §6 scripted windows.
 */
export function generateThumperEventWindows(input: {
	targetResourceId: NamedResourceId;
	runSeed: string;
	isPushRun: boolean;
	tutorialRun?: TutorialThumperRun;
	extractionTailMinutes?: number;
}): ThumperRunWindowPlan {
	if (input.tutorialRun !== undefined) {
		if (input.isPushRun) {
			throw new Error('Tutorial runs do not support push mode');
		}

		const tutorial = generateTutorialEventWindows({
			targetResourceId: input.targetResourceId,
			tutorialRun: input.tutorialRun
		});

		return {
			...tutorial,
			runSeed: tutorialRunSeed(input.tutorialRun),
			isPushRun: false,
			windowCount: tutorial.windows.length,
			eventWindowCount: tutorial.windows.length,
			projectedRecovery: 0
		};
	}

	return generateSeededThumperEventWindows({
		runSeed: input.runSeed,
		targetResourceId: input.targetResourceId,
		isPushRun: input.isPushRun,
		extractionTailMinutes: input.extractionTailMinutes
	});
}
