/** Minimal run indicator for layout nav — one open-run query, no resolution math. */
export type RunBadgeState = 'none' | 'active';

export function runBadgeFromOpenRun(hasOpenRun: boolean): RunBadgeState {
	return hasOpenRun ? 'active' : 'none';
}
