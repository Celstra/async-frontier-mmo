import { describe, expect, it } from 'vitest';
import { isTutorialStep, tutorialNextActionScreen } from './tutorialSteps.js';

describe('tutorialNextActionScreen', () => {
	it('highlights settlement during prologue and order beats', () => {
		expect(tutorialNextActionScreen('prologue')).toBe('settlement');
		expect(tutorialNextActionScreen('hunting')).toBe('field');
		expect(tutorialNextActionScreen('first_orders')).toBe('settlement');
		expect(tutorialNextActionScreen('turn_in')).toBe('settlement');
	});

	it('highlights field during hunt and deploy beats', () => {
		expect(tutorialNextActionScreen('hunting')).toBe('field');
		expect(tutorialNextActionScreen('first_deploy')).toBe('field');
		expect(tutorialNextActionScreen('second_deploy')).toBe('field');
	});

	it('highlights settlement for recall, full claim, and async reveal', () => {
		expect(tutorialNextActionScreen('recall_lesson')).toBe('settlement');
		expect(tutorialNextActionScreen('full_claim')).toBe('settlement');
		expect(tutorialNextActionScreen('async_reveal')).toBe('settlement');
	});

	it('returns null when tutorial is finished', () => {
		expect(tutorialNextActionScreen('done')).toBe(null);
		expect(tutorialNextActionScreen(null)).toBe(null);
	});
});

describe('isTutorialStep', () => {
	it('accepts locked step ids', () => {
		expect(isTutorialStep('hull_patch')).toBe(true);
	});

	it('rejects unknown strings', () => {
		expect(isTutorialStep('frame_chosen')).toBe(false);
	});
});
