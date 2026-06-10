import type { ThumperEventWindowSnapshot } from './resolveThumperRunResult.js';
import type { ThumperEventWindowResponse } from './resolveThumperRunResult.js';

/**
 * Decision 005 — recall ends the run: one recall row, all prior windows answered,
 * no complication responses after the recall window.
 */
export function assertRecallResponseAudit(input: {
	eventWindows: ThumperEventWindowSnapshot[];
	responses: ThumperEventWindowResponse[];
}): void {
	const recallResponses = input.responses.filter(
		(response) => response.chosenResponse === 'recall_early'
	);

	if (recallResponses.length > 1) {
		throw new Error('Only one Recall Early response is allowed per run');
	}

	const recallWindowIndex = recallResponses[0]?.windowIndex;
	if (recallWindowIndex === undefined) {
		return;
	}

	for (const window of input.eventWindows) {
		if (window.windowIndex < recallWindowIndex) {
			const response = input.responses.find((row) => row.windowIndex === window.windowIndex);
			if (!response || response.chosenResponse === 'recall_early') {
				throw new Error(
					`Window ${window.windowIndex} must be answered before Recall Early`
				);
			}
		}

		if (window.windowIndex > recallWindowIndex) {
			const response = input.responses.find((row) => row.windowIndex === window.windowIndex);
			if (response) {
				throw new Error('No responses are allowed after Recall Early');
			}
		}
	}
}
