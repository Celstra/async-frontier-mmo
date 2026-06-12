import type { TutorialStep } from '../tutorial/tutorialSteps.js';

/** Scripted first tutorial deploy — hull fail-safe abort run. */
export const TUTORIAL_RUN_1_SEED = 'tutorial-run-1';

/** Scripted second tutorial deploy — full 5-minute watched run. */
export const TUTORIAL_RUN_2_SEED = 'tutorial-run-2';

/** @deprecated Use {@link TUTORIAL_RUN_1_SEED}. */
export const TUTORIAL_RUN_SEED = TUTORIAL_RUN_1_SEED;

export type TutorialThumperRun = 1 | 2;

export function tutorialRunSeed(run: TutorialThumperRun): string {
	return run === 1 ? TUTORIAL_RUN_1_SEED : TUTORIAL_RUN_2_SEED;
}

export function tutorialRunFromSeed(runSeed: string): TutorialThumperRun | null {
	if (runSeed === TUTORIAL_RUN_1_SEED) {
		return 1;
	}
	if (runSeed === TUTORIAL_RUN_2_SEED) {
		return 2;
	}
	return null;
}

export function isTutorialRunSeed(runSeed: string): boolean {
	return tutorialRunFromSeed(runSeed) !== null;
}

/** Which scripted run deploy is allowed for the current tutorial step, if any. */
export function tutorialDeployForStep(step: string | null): TutorialThumperRun | null {
	if (step === 'first_deploy') {
		return 1;
	}
	if (step === 'second_deploy') {
		return 2;
	}
	return null;
}

export function isScriptedTutorialDeployStep(step: string | null): step is TutorialStep {
	return tutorialDeployForStep(step) !== null;
}

/** @deprecated Pre-slice lesson tests — use {@link TUTORIAL_RUN_1_YIELD_FLOOR}. */
export const FIRST_SESSION_SCANNER_MINIMUM = 30;

/** @deprecated Pre-slice lesson tests. */
export const FIRST_SESSION_PROJECTED_RECOVERY = 113;
