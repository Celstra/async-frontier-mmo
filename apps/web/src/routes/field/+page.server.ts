import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import type { PageServerLoad } from './$types';

/** Decision 024 — FIELD actions live in git history; UI is in-development only. */
export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	return {
		screenId: 'field' as const
	};
};
