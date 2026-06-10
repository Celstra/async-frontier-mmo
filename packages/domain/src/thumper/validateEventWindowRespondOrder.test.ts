import { describe, expect, it } from 'vitest';
import { validateEventWindowRespondOrder } from './validateEventWindowRespondOrder.js';

const tutorialWindows = [
	{ windowIndex: 1, chosenResponse: null },
	{ windowIndex: 2, chosenResponse: null }
] as const;

describe('validateEventWindowRespondOrder', () => {
	it('rejects recall on window 2 before window 1 is answered', () => {
		const result = validateEventWindowRespondOrder({
			windows: tutorialWindows,
			windowIndex: 2,
			chosenResponse: 'recall_early'
		});

		expect(result).toEqual({
			ok: false,
			reason: 'Answer earlier event windows first'
		});
	});

	it('allows recall on window 2 after window 1 is answered', () => {
		const result = validateEventWindowRespondOrder({
			windows: [
				{ windowIndex: 1, chosenResponse: 'signal_tune' },
				{ windowIndex: 2, chosenResponse: null }
			],
			windowIndex: 2,
			chosenResponse: 'recall_early'
		});

		expect(result).toEqual({ ok: true });
	});
});
