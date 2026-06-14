import { getLatestPlaytestEventCreatedAt } from '@async-frontier-mmo/db';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { loadNextActionScreen } from '$lib/server/nextActionLoad';
import { trackReturnVisitIfDue } from '$lib/server/playtestTelemetry';
import type { LayoutServerLoad } from './$types';

const RETURN_VISIT_GAP_MS = 4 * 60 * 60 * 1000;

export const load: LayoutServerLoad = async (event) => {
	event.depends('app:next-action');
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	const latestEventAt = await getLatestPlaytestEventCreatedAt(db, pilotId);
	const nextActionScreen = await loadNextActionScreen(db, pilotId);

	if (
		latestEventAt &&
		Date.now() - latestEventAt.getTime() >= RETURN_VISIT_GAP_MS
	) {
		await trackReturnVisitIfDue(db, pilotId, latestEventAt);
	}

	return {
		nextActionScreen
	};
};
