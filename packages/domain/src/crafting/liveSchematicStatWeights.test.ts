import { describe, expect, it } from 'vitest';
import { MVP_CRAFT_SCHEMATICS } from './schematics/index.js';
import {
	deemphasizedStatsForLiveSchematics,
	deemphasizedStatsForSlotFamily,
	liveSchematicStatWeights,
	schematicStatWeightsForSlotFamily
} from './liveSchematicStatWeights.js';

describe('liveSchematicStatWeights', () => {
	it('marks OQ and directly-read stats as emphasized', () => {
		const weights = liveSchematicStatWeights(MVP_CRAFT_SCHEMATICS);

		expect(weights.OQ).toBe(true);
		expect(weights.conductivity).toBe(true);
		expect(weights.hardness).toBe(true);
		expect(weights.heat_resistance).toBe(true);
		expect(weights.malleability).toBe(true);
	});

	it('has no globally orphan stats after Decision 021 recipe coverage', () => {
		const orphans = deemphasizedStatsForLiveSchematics(MVP_CRAFT_SCHEMATICS);
		expect(orphans).toEqual([]);
	});

	it('de-emphasizes family-orphan stats for conductive metal survey rows', () => {
		const cmWeights = schematicStatWeightsForSlotFamily(
			MVP_CRAFT_SCHEMATICS,
			'conductive_metal'
		);
		expect(cmWeights.conductivity).toBe(true);
		expect(cmWeights.hardness).toBe(false);

		const cmOrphans = deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'conductive_metal');
		expect(cmOrphans).toContain('hardness');
		expect(cmOrphans).not.toContain('OQ');
	});
});
