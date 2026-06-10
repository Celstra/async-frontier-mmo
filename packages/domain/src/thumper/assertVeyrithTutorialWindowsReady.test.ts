import { describe, expect, it } from 'vitest';
import { assertVeyrithTutorialWindowsReady } from './assertVeyrithTutorialWindowsReady.js';

const readyWindows = [
	{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
	{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'clear_pump_problem' }
] as const;

describe('assertVeyrithTutorialWindowsReady', () => {
	it('accepts two answered tutorial windows in order', () => {
		expect(() => assertVeyrithTutorialWindowsReady(readyWindows)).not.toThrow();
	});

	it('rejects zero windows', () => {
		expect(() => assertVeyrithTutorialWindowsReady([])).toThrow(/exactly 2/);
	});

	it('rejects missing responses', () => {
		expect(() =>
			assertVeyrithTutorialWindowsReady([
				readyWindows[0],
				{ ...readyWindows[1], chosenResponse: null }
			])
		).toThrow(/response on every event window/);
	});

	it('accepts recall after window 1 with window 2 left unanswered', () => {
		expect(() =>
			assertVeyrithTutorialWindowsReady([
				readyWindows[0],
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'recall_early' }
			])
		).not.toThrow();
	});
});
