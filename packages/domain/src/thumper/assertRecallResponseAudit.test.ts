import { describe, expect, it } from 'vitest';
import { assertRecallResponseAudit } from './assertRecallResponseAudit.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';

const eventWindows = generateFirstSessionEventWindows({
	targetResourceId: 'veyrith_copper'
}).windows;

describe('assertRecallResponseAudit', () => {
	it('rejects recall when an earlier window is unanswered', () => {
		expect(() =>
			assertRecallResponseAudit({
				eventWindows,
				responses: [
					{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'recall_early' }
				]
			})
		).toThrow(/Window 1 must be answered before Recall Early/);
	});

	it('rejects complication responses after recall', () => {
		expect(() =>
			assertRecallResponseAudit({
				eventWindows,
				responses: [
					{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'recall_early' },
					{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
				]
			})
		).toThrow(/after Recall Early/);
	});

	it('rejects more than one recall response', () => {
		expect(() =>
			assertRecallResponseAudit({
				eventWindows,
				responses: [
					{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'recall_early' },
					{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'recall_early' }
				]
			})
		).toThrow(/Only one Recall Early/);
	});
});
