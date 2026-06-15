import { type TutorialScreenId, tutorialNextActionScreen } from './tutorialSteps.js';

export type NextActionScreenInput = {
	tutorialStep: string | null;
	/** Open order with enough sampled units to turn in at SETTLEMENT. */
	orderReadyToTurnIn: boolean;
	/** Open thumper run in progress. */
	openRunActive: boolean;
	/** Claimable run or unacknowledged claim result waiting on RIG. */
	claimPendingOnRig: boolean;
	/** Foreman briefing / patch / async picker needs SETTLEMENT. */
	settlementBriefingPending: boolean;
};

const SETTLEMENT_BRIEFING_STEPS = new Set([
	'prologue',
	'turn_in',
	'fabricator_online',
	'recall_lesson',
	'hull_patch',
	'full_claim',
	'async_reveal'
]);

export function settlementBriefingPendingForStep(tutorialStep: string | null): boolean {
	return tutorialStep !== null && SETTLEMENT_BRIEFING_STEPS.has(tutorialStep);
}

/** Tutorial nav highlight: step baseline with live-state overlays. */
export function resolveNextActionScreen(input: NextActionScreenInput): TutorialScreenId | null {
	if (input.claimPendingOnRig) {
		return 'rig';
	}
	if (input.orderReadyToTurnIn || input.settlementBriefingPending) {
		return 'settlement';
	}
	if (input.openRunActive) {
		return input.tutorialStep === 'done' ? 'field' : 'rig';
	}
	const base = tutorialNextActionScreen(input.tutorialStep);
	if (input.tutorialStep === 'assemble_rig') {
		return 'workshop';
	}
	return base;
}
