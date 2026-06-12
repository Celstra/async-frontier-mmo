import {
	fabricatorTutorialOrdersFullyBound,
	getPilotTutorialStep,
	setPilotTutorialStep
} from '@async-frontier-mmo/db';
import { isTutorialStep, type TutorialStep } from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

type Db = ReturnType<typeof getGameDb>;

export async function advanceTutorialStepIf(
	db: Db,
	pilotId: string,
	expected: TutorialStep,
	next: TutorialStep
): Promise<boolean> {
	const current = await getPilotTutorialStep(db, pilotId);
	if (current !== expected) {
		return false;
	}

	await setPilotTutorialStep(db, { pilotId, step: next });
	return true;
}

export async function setTutorialStep(
	db: Db,
	pilotId: string,
	step: TutorialStep
): Promise<void> {
	await setPilotTutorialStep(db, { pilotId, step });
}

export async function readTutorialStep(db: Db, pilotId: string): Promise<TutorialStep | null> {
	const step = await getPilotTutorialStep(db, pilotId);
	return isTutorialStep(step) ? step : null;
}

/** Advance hunting → turn_in only after both foreman orders are bound by sampling. */
export async function maybeAdvanceHuntingToTurnIn(db: Db, pilotId: string): Promise<boolean> {
	const step = await readTutorialStep(db, pilotId);
	if (step !== 'hunting') {
		return false;
	}

	const ready = await fabricatorTutorialOrdersFullyBound(db, pilotId);
	if (!ready) {
		return false;
	}

	return advanceTutorialStepIf(db, pilotId, 'hunting', 'turn_in');
}
