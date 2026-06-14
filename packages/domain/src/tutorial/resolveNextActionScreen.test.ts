import { describe, expect, it } from 'vitest';
import { resolveNextActionScreen } from './resolveNextActionScreen.js';

describe('resolveNextActionScreen', () => {
	it('keeps FIELD highlighted while a claim is pending', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'recall_lesson',
				orderReadyToTurnIn: false,
				claimPendingOnField: true,
				settlementBriefingPending: true
			})
		).toBe('field');
	});

	it('points to SETTLEMENT when an order is ready to turn in during hunting', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'hunting',
				orderReadyToTurnIn: true,
				claimPendingOnField: false,
				settlementBriefingPending: false
			})
		).toBe('settlement');
	});

	it('falls back to the step-only map when no overlay applies', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'first_deploy',
				orderReadyToTurnIn: false,
				claimPendingOnField: false,
				settlementBriefingPending: false
			})
		).toBe('field');
	});
});
