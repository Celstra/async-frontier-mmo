import type { ThumperWindowChosenResponse } from './resolveThumperRunResult.js';
import type { EventWindowResponseValidation } from './validateEventWindowResponse.js';

export type EventWindowRow = {
	windowIndex: number;
	chosenResponse: string | null;
};

/**
 * Event windows resolve in order. Recall Early requires every lower-index window
 * to already have a non-recall response recorded.
 */
export function validateEventWindowRespondOrder(input: {
	windows: ReadonlyArray<EventWindowRow>;
	windowIndex: number;
	chosenResponse: ThumperWindowChosenResponse;
}): EventWindowResponseValidation {
	const target = input.windows.find((window) => window.windowIndex === input.windowIndex);
	if (!target) {
		return { ok: false, reason: 'Event window not found' };
	}

	if (target.chosenResponse !== null) {
		return { ok: false, reason: 'Event window already has a response' };
	}

	const unansweredPrior = input.windows.filter(
		(window) => window.windowIndex < input.windowIndex && window.chosenResponse === null
	);
	if (unansweredPrior.length > 0) {
		return { ok: false, reason: 'Answer earlier event windows first' };
	}

	if (input.chosenResponse === 'recall_early') {
		const recallAlreadyRecorded = input.windows.some(
			(window) => window.chosenResponse === 'recall_early'
		);
		if (recallAlreadyRecorded) {
			return { ok: false, reason: 'Run already ended with Recall Early' };
		}
	}

	return { ok: true };
}
