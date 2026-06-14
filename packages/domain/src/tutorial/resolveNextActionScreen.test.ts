import { describe, expect, it } from 'vitest';
import { resolveNextActionScreen } from './resolveNextActionScreen.js';

describe('resolveNextActionScreen', () => {
	it('points to RIG while a claim is pending', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'recall_lesson',
				orderReadyToTurnIn: false,
				openRunActive: false,
				claimPendingOnRig: true,
				settlementBriefingPending: true
			})
		).toBe('rig');
	});

	it('points to RIG during an open run', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'async_reveal',
				orderReadyToTurnIn: false,
				openRunActive: true,
				claimPendingOnRig: false,
				settlementBriefingPending: false
			})
		).toBe('rig');
	});

	it('points to SETTLEMENT when an order is ready to turn in during hunting', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'hunting',
				orderReadyToTurnIn: true,
				openRunActive: false,
				claimPendingOnRig: false,
				settlementBriefingPending: false
			})
		).toBe('settlement');
	});

	it('falls back to the step-only map when no overlay applies', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'first_deploy',
				orderReadyToTurnIn: false,
				openRunActive: false,
				claimPendingOnRig: false,
				settlementBriefingPending: false
			})
		).toBe('field');
	});

	it('highlights FIELD after briefing for first_orders', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'first_orders',
				orderReadyToTurnIn: false,
				openRunActive: false,
				claimPendingOnRig: false,
				settlementBriefingPending: false
			})
		).toBe('field');
	});
});
