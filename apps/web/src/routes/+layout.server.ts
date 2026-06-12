import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async () => {
	/** One-line mission tracker — wired in Phase 4. */
	return {
		missionTicker: null as string | null
	};
};
