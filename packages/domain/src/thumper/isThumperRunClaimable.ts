import {
	effectiveThumperRunDurationSeconds,
	isHullFailsafeActive
} from './hullFailsafeRecall.js';
import { hullTierFromIntegrity } from './hullTier.js';
import { resolveThumperState } from './resolveThumperState.js';

export type ThumperClaimWindowSnapshot = {
	chosenResponse: string | null;
};

/** True when a run can be resolved at claim time (all windows answered, or ended by recall). */
export function isThumperRunReadyToResolve(windows: readonly ThumperClaimWindowSnapshot[]): boolean {
	if (windows.length === 0) {
		return true;
	}

	if (windows.some((window) => window.chosenResponse === 'recall_early')) {
		return true;
	}

	return windows.every((window) => window.chosenResponse !== null);
}

/** Server-side claim gate: windows ready to resolve, and timer elapsed or recall ended the run. */
export function isThumperRunClaimable(input: {
	run: {
		deployedAt: Date;
		durationSeconds: number;
		runHullIntegrity?: number;
		extractionTailMinutes?: number;
	};
	windows: readonly ThumperClaimWindowSnapshot[];
	now: Date;
	firstAsyncWaiverActive?: boolean;
}): boolean {
	const recalled = input.windows.some((window) => window.chosenResponse === 'recall_early');
	if (recalled) {
		return true;
	}

	const runHullIntegrity = input.run.runHullIntegrity ?? 100;
	const hullTier = hullTierFromIntegrity(runHullIntegrity);
	const hullConfig = {
		hullTier,
		hullIntegrityAtDeploy: runHullIntegrity,
		plannedDurationSeconds: input.run.durationSeconds,
		extractionTailMinutes: input.run.extractionTailMinutes,
		firstAsyncWaiverActive: input.firstAsyncWaiverActive
	};
	const effectiveDurationSeconds = effectiveThumperRunDurationSeconds(hullConfig);
	const hullOutReached =
		resolveThumperState({
			deployedAt: input.run.deployedAt,
			durationSeconds: effectiveDurationSeconds,
			now: input.now
		}).status === 'claimable';

	if (isHullFailsafeActive(hullConfig) && hullOutReached) {
		return true;
	}

	if (!isThumperRunReadyToResolve(input.windows)) {
		return false;
	}

	return (
		resolveThumperState({
			deployedAt: input.run.deployedAt,
			durationSeconds: input.run.durationSeconds,
			now: input.now
		}).status === 'claimable'
	);
}
