import {
	getLatestPlaytestEventCreatedAt,
	getPilotTutorialStep
} from '@async-frontier-mmo/db';
import { tutorialNextActionScreen } from '@async-frontier-mmo/domain';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { trackReturnVisitIfDue } from '$lib/server/playtestTelemetry';
import type { LayoutServerLoad } from './$types';

const RETURN_VISIT_GAP_MS = 4 * 60 * 60 * 1000;

export const load: LayoutServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	const [tutorialStep, latestEventAt] = await Promise.all([
		getPilotTutorialStep(db, pilotId),
		getLatestPlaytestEventCreatedAt(db, pilotId)
	]);

	if (
		latestEventAt &&
		Date.now() - latestEventAt.getTime() >= RETURN_VISIT_GAP_MS
	) {
		await trackReturnVisitIfDue(db, pilotId, latestEventAt);
	}

	return {
		nextActionScreen: tutorialNextActionScreen(tutorialStep)
	};
};
