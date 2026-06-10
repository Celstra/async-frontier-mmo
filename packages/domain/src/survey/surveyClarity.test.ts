import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../resources/redMesaBloom.js';
import { surveyRedMesaFirstSession } from './redMesaSurvey.js';
import { exactStatHintCountForSurveyClarity } from './surveyClarity.js';

function countExactHints(survey: ReturnType<typeof surveyRedMesaFirstSession>): number {
	return survey.signals.reduce(
		(total, signal) => total + signal.statHints.filter((hint) => hint.exactValue !== undefined).length,
		0
	);
}

describe('survey with equipped scanner', () => {
	it('without scanner has basic clarity — bands only, no exact stat values', () => {
		const survey = surveyRedMesaFirstSession();

		expect(countExactHints(survey)).toBe(0);
		for (const signal of survey.signals) {
			for (const hint of signal.statHints) {
				expect(hint.exactValue).toBeUndefined();
			}
		}
	});

	it('with scanner has improved clarity that scales with Survey Clarity score', () => {
		const lowClarity = surveyRedMesaFirstSession({ surveyClarityScore: 45 });
		const midClarity = surveyRedMesaFirstSession({ surveyClarityScore: 65 });
		const highClarity = surveyRedMesaFirstSession({ surveyClarityScore: 90 });

		expect(countExactHints(lowClarity)).toBe(0);
		expect(countExactHints(midClarity)).toBe(3);
		expect(countExactHints(highClarity)).toBe(9);

		expect(exactStatHintCountForSurveyClarity(45)).toBe(0);
		expect(exactStatHintCountForSurveyClarity(65)).toBe(1);
		expect(exactStatHintCountForSurveyClarity(90)).toBe(3);
	});

	it('does not change underlying resource stats — only information quality', () => {
		const basic = surveyRedMesaFirstSession();
		const enhanced = surveyRedMesaFirstSession({ surveyClarityScore: 95 });

		for (const signal of basic.signals) {
			const resource = getRedMesaResource(signal.resourceId);
			const enhancedSignal = enhanced.signals.find(
				(candidate) => candidate.resourceId === signal.resourceId
			)!;

			for (const hint of enhancedSignal.statHints) {
				if (hint.exactValue !== undefined) {
					expect(hint.exactValue).toBe(resource.stats[hint.stat]);
				}
			}

			expect(enhancedSignal.statHints.map((hint) => hint.band)).toEqual(
				signal.statHints.map((hint) => hint.band)
			);
		}
	});
});
