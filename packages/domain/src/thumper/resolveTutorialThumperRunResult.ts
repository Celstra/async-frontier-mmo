import { ACTIVE_PHASE_SECONDS } from './deployPreview.js';
import {
	resolveThumperRunResult,
	type ThumperEventWindowResponse,
	type ThumperEventWindowSnapshot,
	type ThumperRunResult,
	type ThumperWindowChosenResponse
} from './resolveThumperRunResult.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';
import type { NamedResourceId } from '../resources/types.js';
import {
	SCAVENGED_HULL_INTEGRITY,
	TUTORIAL_RUN_1_MINUTES,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	TUTORIAL_RUN_2_YIELD
} from '../tuning.js';
import type { TutorialThumperRun } from './tutorialThumperRuns.js';
import { totalRunDurationSeconds } from './deployPreview.js';

export {
	type ThumperEventWindowResponse,
	type ThumperRunResult,
	type ThumperWindowChosenResponse
};

/**
 * Resolve a scripted tutorial thumper run — run 1 hull fail-safe with yield floor, run 2 fixed yield.
 */
export function resolveTutorialThumperRunResult(input: {
	tutorialRun: TutorialThumperRun;
	targetResourceId: NamedResourceId;
	responses: ThumperEventWindowResponse[];
	eventWindows: ThumperEventWindowSnapshot[];
	appliedWear?: number;
	partModifiers?: ThumperPartRunModifiers;
	projectedRecovery: number;
	hullIntegrityAtDeploy?: number;
	plannedDurationSeconds?: number;
}): ThumperRunResult {
	if (input.tutorialRun === 2) {
		const result = resolveThumperRunResult({
			runConfig: {
				targetResourceId: input.targetResourceId,
				projectedRecovery: input.projectedRecovery,
				appliedWear: input.appliedWear ?? 0,
				partModifiers: input.partModifiers
			},
			eventWindows: input.eventWindows,
			responses: input.responses
		});

		return {
			...result,
			recoveredQuantity: TUTORIAL_RUN_2_YIELD,
			wasteQuantity: Math.max(0, result.projectedRecovery - TUTORIAL_RUN_2_YIELD)
		};
	}

	const hullIntegrityAtDeploy = input.hullIntegrityAtDeploy ?? SCAVENGED_HULL_INTEGRITY;
	const plannedDurationSeconds =
		input.plannedDurationSeconds ??
		totalRunDurationSeconds(ACTIVE_PHASE_SECONDS, TUTORIAL_RUN_1_MINUTES);

	const result = resolveThumperRunResult({
		runConfig: {
			targetResourceId: input.targetResourceId,
			projectedRecovery: input.projectedRecovery,
			appliedWear: input.appliedWear ?? 0,
			partModifiers: input.partModifiers,
			hullTier: 'scavenged',
			hullIntegrityAtDeploy,
			plannedDurationSeconds
		},
		eventWindows: input.eventWindows,
		responses: input.responses
	});

	return {
		...result,
		recoveredQuantity: Math.max(TUTORIAL_RUN_1_YIELD_FLOOR, result.recoveredQuantity)
	};
}
