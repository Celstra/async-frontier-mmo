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
	run: { deployedAt: Date; durationSeconds: number };
	windows: readonly ThumperClaimWindowSnapshot[];
	now: Date;
}): boolean {
	if (!isThumperRunReadyToResolve(input.windows)) {
		return false;
	}

	const recalled = input.windows.some((window) => window.chosenResponse === 'recall_early');
	if (recalled) {
		return true;
	}

	return (
		resolveThumperState({
			deployedAt: input.run.deployedAt,
			durationSeconds: input.run.durationSeconds,
			now: input.now
		}).status === 'claimable'
	);
}
