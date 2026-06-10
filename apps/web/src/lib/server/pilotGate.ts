import {
	ensurePilotGameReady,
	ensureSessionPilot,
	getPilotById,
	pilotNeedsFrameChoice
} from '@async-frontier-mmo/db';
import { fail } from '@sveltejs/kit';
import type { getGameDb } from './gameDb.js';

export async function requireFrameChosenPilot(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
) {
	await ensureSessionPilot(db, pilotId);
	const pilot = await getPilotById(db, pilotId);
	if (!pilot || pilotNeedsFrameChoice(pilot)) {
		return fail(400, { message: 'Choose a frame on Pilot Home before continuing' });
	}
	await ensurePilotGameReady(db, pilotId);
	return null;
}
