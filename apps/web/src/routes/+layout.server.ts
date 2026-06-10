import { getOpenThumperRunForPilot } from '@async-frontier-mmo/db';
import { env } from '$env/dynamic/private';
import { runBadgeFromOpenRun, type RunBadgeState } from '$lib/layout/runBadge';
import { getGameDb } from '$lib/server/gameDb';
import { resolvePilotId } from '$lib/server/pilot';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	let runBadge: RunBadgeState = 'none';

	if (!env.DATABASE_URL) {
		return { runBadge };
	}

	try {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const openRun = await getOpenThumperRunForPilot(db, pilotId);
		runBadge = runBadgeFromOpenRun(openRun !== null);
	} catch {
		// Missing DB, connection errors, etc. — layout still renders.
	}

	return { runBadge };
};
