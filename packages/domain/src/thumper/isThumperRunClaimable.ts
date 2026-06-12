import type { HullTier } from '../tuning.js';
import {
	effectiveThumperRunDurationSeconds,
	isHullFailsafeActive
} from './hullFailsafeRecall.js';
import { resolveThumperState } from './resolveThumperState.js';

function hullTierFromIntegrity(integrity: number): HullTier {
	if (integrity <= 10) {
		return 'scavenged';
	}
	if (integrity <= 35) {
		return 'patched';
	}
	return 'basic';
}

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
	run: { deployedAt: Date; durationSeconds: number; runHullIntegrity?: number };
	windows: readonly ThumperClaimWindowSnapshot[];
	now: Date;
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
		plannedDurationSeconds: input.run.durationSeconds
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
