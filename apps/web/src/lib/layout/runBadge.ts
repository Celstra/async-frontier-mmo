import { resolveThumperState } from '@async-frontier-mmo/domain';

/** Minimal run indicator for layout nav — one open-run query + domain timer resolution. */
export type RunBadgeState = 'none' | 'active' | 'claimable';

export type OpenRunBadgeInput = {
	deployedAt: Date;
	durationSeconds: number;
};

export function runBadgeFromOpenRun(
	openRun: OpenRunBadgeInput | null,
	now: Date = new Date()
): RunBadgeState {
	if (!openRun) {
		return 'none';
	}

	return resolveThumperState({
		deployedAt: openRun.deployedAt,
		durationSeconds: openRun.durationSeconds,
		now
	}).status;
}
