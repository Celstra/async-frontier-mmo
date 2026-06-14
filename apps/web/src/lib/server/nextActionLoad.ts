import {
	getActiveSettlementMilestoneKey,
	getPilotTutorialStep,
	listMissionOrderNudgeShownIds,
	listPilotResourceStacksWithInstances,
	listSettlementOrdersForMilestone
} from '@async-frontier-mmo/db';
import {
	resolveNextActionScreen,
	settlementBriefingPendingForStep
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';
import { loadClaimScreen } from './fieldClaimState.js';
import { hasOrderReadyToTurnIn } from './settlementLoad.js';

export async function loadNextActionScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now = new Date()
) {
	const [tutorialStep, orderReadyToTurnIn, claimView] = await Promise.all([
		getPilotTutorialStep(db, pilotId),
		hasOrderReadyToTurnIn(db, pilotId),
		loadClaimScreen(db, pilotId, now)
	]);

	const claimPendingOnField =
		claimView.mode === 'claimable' || claimView.mode === 'result';

	return resolveNextActionScreen({
		tutorialStep,
		orderReadyToTurnIn,
		claimPendingOnField,
		settlementBriefingPending: settlementBriefingPendingForStep(tutorialStep)
	});
}
