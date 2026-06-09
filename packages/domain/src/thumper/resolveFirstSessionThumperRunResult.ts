import type { NamedResourceId } from '../resources/types.js';
import { getMatchingAction } from './complicationActions.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';

/** Base tutorial extraction before event penalties (Decision 011). */
export const FIRST_SESSION_PROJECTED_RECOVERY = 60;

/** Minimum recovered Veyrith Copper to craft Survey Scanner Module Mk I on first claim. */
export const FIRST_SESSION_SCANNER_MINIMUM = 40;

const SIGNAL_DRIFT_PENALTY_WASTE = 10;
const PUMP_STRAIN_PENALTY_WASTE = 15;

export type ThumperWindowChosenResponse = ThumperEventActionId | 'hold';

export type ThumperEventWindowResponse = {
	windowIndex: number;
	complication: ThumperComplicationId;
	chosenResponse: ThumperWindowChosenResponse;
};

export type ThumperRunResult = {
	targetResourceId: NamedResourceId;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	explanation: string;
};

const FIRST_SESSION_TARGET: NamedResourceId = 'veyrith_copper';

function penaltyWasteForResponse(
	complication: ThumperComplicationId,
	chosenResponse: ThumperWindowChosenResponse
): number {
	const matchingAction = getMatchingAction(complication);
	if (chosenResponse === matchingAction) {
		return 0;
	}

	if (complication === 'signal_drift') {
		return SIGNAL_DRIFT_PENALTY_WASTE;
	}

	return PUMP_STRAIN_PENALTY_WASTE;
}

function describeResponse(
	complication: ThumperComplicationId,
	chosenResponse: ThumperWindowChosenResponse
): string {
	const matchingAction = getMatchingAction(complication);
	if (chosenResponse === matchingAction) {
		return `${complication}: used ${matchingAction} — no waste from this window.`;
	}
	if (chosenResponse === 'hold') {
		return `${complication}: held/ignored — extraction loss converted to waste.`;
	}
	return `${complication}: used ${chosenResponse} instead of ${matchingAction} — partial recovery loss.`;
}

/**
 * Decision 011 — resolve first-session Veyrith Copper run from stored window responses.
 * Quantity and waste only; named resource stats stay immutable in the catalog.
 */
export function resolveFirstSessionThumperRunResult(input: {
	targetResourceId: NamedResourceId;
	responses: ThumperEventWindowResponse[];
}): ThumperRunResult {
	if (input.targetResourceId !== FIRST_SESSION_TARGET) {
		throw new Error(
			`First-session run result is only defined for ${FIRST_SESSION_TARGET}`
		);
	}

	if (input.responses.length !== 2) {
		throw new Error('First-session run expects exactly two event window responses');
	}

	const projectedRecovery = FIRST_SESSION_PROJECTED_RECOVERY;
	let wasteQuantity = 0;
	const explanationParts: string[] = [];

	for (const response of input.responses) {
		wasteQuantity += penaltyWasteForResponse(response.complication, response.chosenResponse);
		explanationParts.push(describeResponse(response.complication, response.chosenResponse));
	}

	const rawRecovered = projectedRecovery - wasteQuantity;
	const recoveredQuantity = Math.max(FIRST_SESSION_SCANNER_MINIMUM, rawRecovered);

	if (rawRecovered < FIRST_SESSION_SCANNER_MINIMUM) {
		explanationParts.push(
			`First-session floor applied: recovered at least ${FIRST_SESSION_SCANNER_MINIMUM} for Survey Scanner Module Mk I.`
		);
	}

	return {
		targetResourceId: input.targetResourceId,
		projectedRecovery,
		recoveredQuantity,
		wasteQuantity,
		explanation: explanationParts.join(' ')
	};
}
