import { describe, expect, it } from 'vitest';
import { surveyRedMesaFirstSession } from './redMesaSurvey.js';

describe('surveyRedMesaFirstSession', () => {
	it('returns exactly the first-session starter comparison set', () => {
		const result = surveyRedMesaFirstSession();

		expect(result.signals).toHaveLength(3);
		expect(result.signals.map((signal) => signal.resourceId)).toEqual([
			'keth_iron',
			'veyrith_copper',
			'thornwake_crystal'
		]);
	});

	it('recommends Veyrith Copper without removing other signals', () => {
		const result = surveyRedMesaFirstSession();

		expect(result.recommendedResourceId).toBe('veyrith_copper');
		const veyrith = result.signals.find((signal) => signal.resourceId === 'veyrith_copper');
		expect(veyrith?.recommended).toBe(true);
		expect(result.signals.filter((signal) => signal.recommended)).toHaveLength(1);
	});

	it('includes enough display info for a beginner to compare signals', () => {
		const result = surveyRedMesaFirstSession();

		for (const signal of result.signals) {
			expect(signal.displayName.length).toBeGreaterThan(0);
			expect(signal.family).toBeTruthy();
			expect(signal.teachingNote.length).toBeGreaterThan(10);
			expect(signal.statHints.length).toBeGreaterThanOrEqual(2);
			for (const hint of signal.statHints) {
				expect(hint.band).toBeTruthy();
			}
		}
	});

	it('does not expose exact internal stat values on first survey', () => {
		const result = surveyRedMesaFirstSession();

		for (const signal of result.signals) {
			expect(signal).not.toHaveProperty('stats');
		}
	});

	it('is deterministic across calls', () => {
		expect(surveyRedMesaFirstSession()).toEqual(surveyRedMesaFirstSession());
	});
});
