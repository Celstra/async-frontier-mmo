import {
	getPilotTutorialStep,
	getSettlementMilestoneUnlockedAt,
	hasPilotCompletedTutorialThumper
} from '@async-frontier-mmo/db';
import { TUTORIAL_RUN_SEED } from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

/** Root `/` routing — tutorial step drives entry screen (Phase 7). */
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

	if (tutorialStep === 'prologue') {
		return '/prologue';
	}

	if (tutorialStep === 'assemble_rig') {
		return '/workshop';
	}

	if (fabricatorUnlocked || hasCompletedTutorial) {
		return '/settlement';
	}

	if (
		tutorialStep === 'first_orders' ||
		tutorialStep === 'turn_in' ||
		tutorialStep === 'fabricator_online' ||
		tutorialStep === 'hull_patch' ||
		tutorialStep === 'async_reveal'
	) {
		return '/settlement';
	}

	return '/field';
}
