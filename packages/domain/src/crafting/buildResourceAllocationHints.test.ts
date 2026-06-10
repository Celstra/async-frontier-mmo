import { describe, expect, it } from 'vitest';
import { MVP_CRAFT_SCHEMATICS, SURVEY_SCANNER_MK_I } from './schematics/index.js';
import {
	buildResourceAllocationHints,
	stackSlotFitScore
} from './buildResourceAllocationHints.js';

describe('buildResourceAllocationHints', () => {
	it('ranks a conductive stack for scanner conductive core', () => {
		const hints = buildResourceAllocationHints(MVP_CRAFT_SCHEMATICS, [
			{
				resourceInstanceId: 'veyrith-id',
				resourceSlug: 'veyrith_copper',
				displayName: 'Veyrith Copper',
				family: 'conductive_metal',
				quantity: 40,
				stats: {
					OQ: 72,
					conductivity: 88,
					hardness: 40,
					heat_resistance: 35,
					malleability: 60
				}
			}
		]);

		expect(hints[0]?.bestUse).toContain('Survey Scanner');
		expect(hints[0]?.bestUse).toContain('Conductive Core');
	});

	it('scores slot fit from weighted property terms', () => {
		const slot = SURVEY_SCANNER_MK_I.slots[0]!;
		const score = stackSlotFitScore(SURVEY_SCANNER_MK_I, slot.id, {
			OQ: 70,
			conductivity: 90,
			hardness: 50,
			heat_resistance: 40,
			malleability: 55
		});

		expect(score).toBeGreaterThan(0);
	});
});
