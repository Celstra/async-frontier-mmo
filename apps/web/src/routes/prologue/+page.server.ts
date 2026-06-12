import { getPilotTutorialStep } from '@async-frontier-mmo/db';
import { redirect } from '@sveltejs/kit';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { trackPrologueDone } from '$lib/server/playtestTelemetry';
import { advanceTutorialStepIf, readTutorialStep } from '$lib/server/tutorialOrchestration';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	const step = await getPilotTutorialStep(db, pilotId);
	if (step !== 'prologue') {
		redirect(303, step === null ? '/settlement' : '/');
	}

	return {};
};

export const actions: Actions = {
	continue: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const step = await readTutorialStep(db, pilotId);
		if (step !== 'prologue') {
			redirect(303, '/');
		}

		await trackPrologueDone(db, pilotId);
		await advanceTutorialStepIf(db, pilotId, 'prologue', 'first_orders');

		redirect(303, '/settlement');
	}
};
