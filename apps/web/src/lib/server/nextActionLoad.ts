import { getOpenThumperRunForPilot, getPilotTutorialStep } from '@async-frontier-mmo/db';
import {
	resolveNextActionScreen,
	settlementBriefingPendingForStep
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';
import { WORKSHOP_SLICE_PLAYTEST } from '$lib/decision024';
import { loadClaimScreen } from './fieldClaimState.js';
import { hasOrderReadyToTurnIn } from './settlementLoad.js';
import { trackNextActionResolved } from './playtestTelemetry.js';

export async function loadNextActionScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now = new Date()
) {
	if (WORKSHOP_SLICE_PLAYTEST) {
		const tutorialStep = await getPilotTutorialStep(db, pilotId);
		await trackNextActionResolved(db, pilotId, {
			nextActionScreen: 'workshop',
			tutorialStep,
			openRunActive: false,
			claimPendingOnRig: false
		});
		return 'workshop' as const;
	}

	const [tutorialStep, orderReadyToTurnIn, claimView, openRun] = await Promise.all([
		getPilotTutorialStep(db, pilotId),
		hasOrderReadyToTurnIn(db, pilotId),
		loadClaimScreen(db, pilotId, now),
		getOpenThumperRunForPilot(db, pilotId)
	]);

	const nextActionScreen = resolveNextActionScreen({
		tutorialStep,
		orderReadyToTurnIn,
		openRunActive: openRun !== null,
		claimPendingOnRig: claimView.mode === 'claimable' || claimView.mode === 'result',
		settlementBriefingPending: settlementBriefingPendingForStep(tutorialStep)
	});

	await trackNextActionResolved(db, pilotId, {
		nextActionScreen,
		tutorialStep,
		openRunActive: openRun !== null,
		claimPendingOnRig: claimView.mode === 'claimable' || claimView.mode === 'result'
	});

	return nextActionScreen;
}
