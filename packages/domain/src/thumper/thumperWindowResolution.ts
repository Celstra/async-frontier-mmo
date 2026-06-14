import { complicationDisplayName } from './eventActionLabels.js';
import type { EventWindowMeterSnapshot } from './eventWindowOutcome.js';
import {
	parseEventWindowSeverity,
	type EventWindowSeverity
} from './eventWindowSeverity.js';
import { holdPenaltyForResponse, holdPenaltyRangeLabel } from './holdPenalty.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type { ThumperWindowChosenResponse } from './resolveThumperRunResult.js';

export const COMPLICATION_PENALTY_WASTE: Record<ThumperComplicationId, number> = {
	signal_drift: 10,
	hull_damage: 12,
	threat_surge: 12,
	pump_strain: 15
};

export type PenaltyWasteContext = {
	severity?: EventWindowSeverity;
	onsetMeters?: EventWindowMeterSnapshot;
	tutorialDeterministic?: boolean;
};

function resolvePenaltyContext(
	severityOrContext: EventWindowSeverity | PenaltyWasteContext
): PenaltyWasteContext {
	if (typeof severityOrContext === 'string') {
		return { severity: severityOrContext };
	}
	return severityOrContext;
}

export function penaltyWasteForResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>,
	severityOrContext: EventWindowSeverity | PenaltyWasteContext = 'minor'
): number {
	const context = resolvePenaltyContext(severityOrContext);
	const severity = context.severity ?? 'minor';

	if (chosenResponse === matchingAction) {
		return 0;
	}

	if (chosenResponse === 'hold') {
		if (context.onsetMeters) {
			return holdPenaltyForResponse({
				severity,
				complication,
				meters: context.onsetMeters,
				tutorialDeterministic: context.tutorialDeterministic
			});
		}
		const range = holdPenaltyRangeLabel(severity);
		const [lo, hi] = range.split('–').map((value) => Number.parseInt(value, 10));
		return Math.round((lo + hi) / 2);
	}

	return COMPLICATION_PENALTY_WASTE[complication];
}

export { parseEventWindowSeverity };

/** Stored on thumper_run_results.explanation — keeps action ids for audit replay. */
export function describeWindowResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>
): string {
	if (chosenResponse === matchingAction) {
		return `${complication}: used ${matchingAction} — no waste from this window.`;
	}
	if (chosenResponse === 'hold') {
		return `${complication}: held/ignored — extraction loss converted to waste.`;
	}
	return `${complication}: used ${chosenResponse} instead of ${matchingAction} — partial recovery loss.`;
}

/** Player-facing line on Claim Results screen (Decision 013). */
export function describeClaimWindowConsequence(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>
): string {
	if (chosenResponse === matchingAction) {
		return `${complicationDisplayName(complication)}: matching action — no waste from this window.`;
	}
	if (chosenResponse === 'hold') {
		return `${complicationDisplayName(complication)}: held/ignored — extraction loss converted to waste.`;
	}
	return `${complicationDisplayName(complication)}: wrong action — partial recovery loss.`;
}

export const RECALL_EXPLANATION_PREFIX =
	'Recall Early: secured progress kept; remaining projected recovery was not extracted.';
