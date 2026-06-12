import {
	getPilotTutorialStep,
	getSettlementMilestoneUnlockedAt,
	hasPilotCompletedTutorialThumper
} from '@async-frontier-mmo/db';
import { TUTORIAL_RUN_SEED } from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

/** Root `/` routing — Phase 4 slice; expanded in Phase 7 tutorial orchestration. */
export async function resolveRootRedirect(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<string> {
	const [fabricatorUnlocked, hasCompletedTutorial, tutorialStep] = await Promise.all([
		getSettlementMilestoneUnlockedAt(db, {
			pilotId,
			milestoneKey: 'fabricator_online'
		}),
		hasPilotCompletedTutorialThumper(db, pilotId, TUTORIAL_RUN_SEED),
		getPilotTutorialStep(db, pilotId)
	]);

	if (fabricatorUnlocked || hasCompletedTutorial) {
		return '/settlement';
	}

	if (tutorialStep === 'turn_in' || tutorialStep === 'fabricator_online') {
		return '/settlement';
	}

	return '/field';
}
