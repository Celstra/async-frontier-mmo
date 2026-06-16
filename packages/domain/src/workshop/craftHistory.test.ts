import { describe, expect, it } from 'vitest';
import { BASIC_DRILL_HEAD } from '../crafting/schematics/index.js';
import { pickBestWorkshopCraftItem, scoreWorkshopCraftItem } from './craftHistory.js';

describe('workshop craft history', () => {
	it('scores items by summed property lines', () => {
		expect(
			scoreWorkshopCraftItem(BASIC_DRILL_HEAD, {
				extraction_rate: 50,
				depth_access: 40,
				wear_control: 30
			})
		).toBe(120);
	});

	it('picks the highest-scoring craft for a schematic', () => {
		const best = pickBestWorkshopCraftItem(BASIC_DRILL_HEAD, [
			{
				id: 'a',
				propertyScores: { extraction_rate: 40, depth_access: 40, wear_control: 40 }
			},
			{
				id: 'b',
				propertyScores: { extraction_rate: 55, depth_access: 45, wear_control: 35 }
			}
		]);

		expect(best?.id).toBe('b');
	});
});
