import { getRedMesaResource } from '../resources/redMesaBloom.js';
import { getPropertyOutputBand } from '../crafting/propertyBand.js';
import type { NamedResourceId } from '../resources/types.js';
import type { RedMesaSurveyResult } from './types.js';

/** Equipped Survey Scanner Module Mk I — only Survey Clarity affects read quality in this lesson. */
export type SurveyScannerEquipment = {
	surveyClarityScore: number;
};

/**
 * How many stat hints per signal reveal exact internal values (1–1000).
 * Scales with crafted Survey Clarity (0–100) via output bands — better parts read clearer.
 */
export function exactStatHintCountForSurveyClarity(surveyClarityScore: number): number {
	if (surveyClarityScore <= 0) {
		return 0;
	}

	const band = getPropertyOutputBand(surveyClarityScore);
	switch (band) {
		case 'poor':
		case 'basic':
			return 0;
		case 'solid':
			return 1;
		case 'strong':
			return 2;
		case 'excellent':
		case 'exceptional':
			return 3;
	}
}

/**
 * Applies scanner read quality to a survey result.
 * Does not mutate bloom resource stats — only enriches hint presentation.
 */
export function applySurveyClarityToResult(
	survey: RedMesaSurveyResult,
	surveyClarityScore: number
): RedMesaSurveyResult {
	const revealCount = exactStatHintCountForSurveyClarity(surveyClarityScore);
	if (revealCount === 0) {
		return survey;
	}

	return {
		...survey,
		signals: survey.signals.map((signal) => {
			const resourceStats = getRedMesaResource(signal.resourceId as NamedResourceId).stats;

			return {
				...signal,
				statHints: signal.statHints.map((hint, index) => ({
					...hint,
					exactValue: index < revealCount ? resourceStats[hint.stat] : undefined
				}))
			};
		})
	};
}
