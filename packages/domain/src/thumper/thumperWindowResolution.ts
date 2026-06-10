import type { FrameId } from 'shared';
import { complicationDisplayName } from './eventActionLabels.js';
import {
	holdPenaltyForSeverity,
	parseEventWindowSeverity,
	type EventWindowSeverity
} from './eventWindowSeverity.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type { ThumperWindowChosenResponse } from './resolveThumperRunResult.js';

export const COMPLICATION_PENALTY_WASTE: Record<ThumperComplicationId, number> = {
	signal_drift: 10,
	hull_damage: 12,
	threat_surge: 12,
	pump_strain: 15
};

export function penaltyWasteForResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>,
	severity: EventWindowSeverity = 'minor'
): number {
	if (chosenResponse === matchingAction) {
		return 0;
	}

	if (chosenResponse === 'hold') {
		return holdPenaltyForSeverity(severity);
	}

	return COMPLICATION_PENALTY_WASTE[complication];
}

export { parseEventWindowSeverity };

/** Stored on thumper_run_results.explanation — keeps action ids for audit replay. */
export function describeWindowResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>,
	frameBonus: number,
	pilotFrame: FrameId
): string {
	if (chosenResponse === matchingAction) {
		if (frameBonus > 0) {
			return `${complication}: used ${matchingAction} — ${pilotFrame} frame bonus +${frameBonus} recovery.`;
		}
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
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>,
	frameBonus: number,
	pilotFrame: FrameId
): string {
	if (chosenResponse === matchingAction) {
		if (frameBonus > 0) {
			return `${complicationDisplayName(complication)}: matching action — ${pilotFrame} frame bonus +${frameBonus} recovery.`;
		}
		return `${complicationDisplayName(complication)}: matching action — no waste from this window.`;
	}
	if (chosenResponse === 'hold') {
		return `${complicationDisplayName(complication)}: held/ignored — extraction loss converted to waste.`;
	}
	return `${complicationDisplayName(complication)}: wrong action — partial recovery loss.`;
}

export const RECALL_EXPLANATION_PREFIX =
	'Recall Early: secured progress kept; remaining projected recovery was not extracted.';
