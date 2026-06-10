import { describe, expect, it } from 'vitest';
import { buildActiveBloomSurvey } from './activeBloomSurvey.js';

const sampleResource = {
	resourceSlug: 'cm_test_copper',
	displayName: 'Test Copper',
	family: 'conductive_metal' as const,
	stats: {
		OQ: 700,
		conductivity: 900,
		hardness: 200,
		heat_resistance: 300,
		malleability: 400
	},
	concentrationMinPercent: 30,
	concentrationMaxPercent: 65
};

describe('buildActiveBloomSurvey', () => {
	it('orders emphasized stats before de-emphasized stats', () => {
		const survey = buildActiveBloomSurvey({
			bloomId: 2,
			resources: [sampleResource]
		});

		const hints = survey.signals[0]!.statHints;
		const firstDeemphasizedIndex = hints.findIndex((hint) => !hint.emphasized);
		if (firstDeemphasizedIndex >= 0) {
			expect(hints.slice(firstDeemphasizedIndex).every((hint) => !hint.emphasized)).toBe(true);
			expect(hints.slice(0, firstDeemphasizedIndex).every((hint) => hint.emphasized)).toBe(true);
		}
	});

	it('reveals exact values only for emphasized stats when clarity is equipped', () => {
		const survey = buildActiveBloomSurvey({
			bloomId: 2,
			resources: [sampleResource],
			surveyClarityScore: 80
		});

		const hints = survey.signals[0]!.statHints;
		for (const hint of hints) {
			if (hint.emphasized) {
				expect(hint.exactValue).toBe(sampleResource.stats[hint.stat]);
			} else {
				expect(hint.exactValue).toBeUndefined();
			}
		}
	});
});
