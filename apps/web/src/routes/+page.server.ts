import { redirect } from '@sveltejs/kit';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { resolveRootRedirect } from '$lib/server/rootRedirect';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	const target = await resolveRootRedirect(db, pilotId);
	redirect(303, target);
};
