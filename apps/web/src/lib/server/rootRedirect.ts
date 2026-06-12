import { getPilotTutorialStep } from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';

/** Root `/` — new pilots land on SETTLEMENT; deploy beats route to FIELD or WORKSHOP. */
export async function resolveRootRedirect(
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
