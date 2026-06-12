import { describe, expect, it } from 'vitest';
import { isTutorialStep, tutorialNextActionScreen } from './tutorialSteps.js';

describe('tutorialNextActionScreen', () => {
	it('highlights settlement during prologue and order beats', () => {
		expect(tutorialNextActionScreen('prologue')).toBe('settlement');
		expect(tutorialNextActionScreen('first_orders')).toBe('settlement');
		expect(tutorialNextActionScreen('turn_in')).toBe('settlement');
	});

	it('highlights field during hunt and deploy beats', () => {
		expect(tutorialNextActionScreen('hunting')).toBe('field');
		expect(tutorialNextActionScreen('first_deploy')).toBe('field');
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
