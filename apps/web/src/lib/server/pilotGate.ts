import { ensurePilotGameReady, ensureSessionPilot } from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';

/** Ensures the session pilot exists and tutorial bootstrap rows are present. */
export async function requirePlayablePilot(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
) {
	await ensureSessionPilot(db, pilotId);
	await ensurePilotGameReady(db, pilotId);
	return null;
}

/** @deprecated Use {@link requirePlayablePilot} — frame choice removed in slice Phase 2. */
export const requireFrameChosenPilot = requirePlayablePilot;
