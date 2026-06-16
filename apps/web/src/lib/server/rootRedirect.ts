import { getPilotTutorialStep } from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';
import { WORKSHOP_SLICE_PLAYTEST } from '$lib/decision024';

/** Root `/` — Decision 024 pilots land on WORKSHOP. */
export async function resolveRootRedirect(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<string> {
	if (WORKSHOP_SLICE_PLAYTEST) {
		return '/workshop';
	}

	return resolveLegacyRootRedirect(db, pilotId);
}

/** Pre-Decision 024 tutorial funnel (restored when WORKSHOP_SLICE_PLAYTEST is false). */
export async function resolveLegacyRootRedirect(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<string> {
	const tutorialStep = await getPilotTutorialStep(db, pilotId);

	if (tutorialStep === 'assemble_rig') {
		return '/workshop';
	}

	if (tutorialStep === 'first_deploy' || tutorialStep === 'second_deploy') {
		return '/field';
	}

	return '/settlement';
}
