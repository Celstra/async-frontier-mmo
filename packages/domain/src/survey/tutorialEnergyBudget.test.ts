import { describe, expect, it } from 'vitest';
import {
	FAMILY_SCAN_ENERGY_COST,
	SAMPLE_ENERGY_COST,
	SURVEY_ENERGY_CAP,
	sampleYieldFromConcentration
} from './prospectingSampling.js';
import { TUTORIAL_ORDER_CM_STACK, TUTORIAL_ORDER_SA_STACK } from '../tuning.js';

// Worst-case first-session energy bill (slice spec §6). A fresh pilot starts at
// cap with ~zero trickle during a 20-minute tutorial, so the whole bill must fit
// the cap. Assumes the locked bloom's worst spots: Keth Iron range floor 55%,
// Conductive Slag range floor 50% (Decision 021 concentration ranges).
describe('tutorial energy budget', () => {
	it('worst-case tutorial bill fits inside the energy cap', () => {
		const kethWorstYield = sampleYieldFromConcentration(55);
		const slagWorstYield = sampleYieldFromConcentration(50);

		const saSamples = Math.ceil(TUTORIAL_ORDER_SA_STACK / kethWorstYield);
		const cmSamples = Math.ceil(TUTORIAL_ORDER_CM_STACK / slagWorstYield);

		// First sample of each resource is free (stat-reveal rule): Keth, Slag,
		// and the Veyrith wow sample all cost nothing.
		const paidSamples = saSamples - 1 + (cmSamples - 1);
		const scans = 2 * FAMILY_SCAN_ENERGY_COST;
		const bill = paidSamples * SAMPLE_ENERGY_COST + scans;

		expect(bill).toBeLessThanOrEqual(SURVEY_ENERGY_CAP);
		// Keep real headroom for one exploratory mistake (an extra scan or sample).
		expect(SURVEY_ENERGY_CAP - bill).toBeGreaterThanOrEqual(SAMPLE_ENERGY_COST);
	});
});
