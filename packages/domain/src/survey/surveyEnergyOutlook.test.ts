import { describe, expect, it } from 'vitest';
import {
	FAMILY_SCAN_ENERGY_COST,
	SAMPLE_ENERGY_COST,
	SURVEY_ENERGY_CAP,
	SURVEY_ENERGY_REGEN_PER_MINUTE
} from './prospectingSampling.js';
import { surveyEnergyOutlook } from './surveyEnergyOutlook.js';

describe('surveyEnergyOutlook', () => {
	it('reports full energy as immediately actionable', () => {
		const outlook = surveyEnergyOutlook({
			storedEnergy: SURVEY_ENERGY_CAP,
			lastUpdatedAtMs: 0,
			nowMs: 0
		});

		expect(outlook.regenPerMinute).toBe(SURVEY_ENERGY_REGEN_PER_MINUTE);
		expect(outlook.minutesUntilFull).toBe(0);
		expect(outlook.canScanNow).toBe(true);
		expect(outlook.canSampleNow).toBe(true);
		expect(outlook.minutesUntilNextScan).toBe(0);
		expect(outlook.minutesUntilNextSample).toBe(0);
	});

	it('computes minutes until scan and sample from a partial pool', () => {
		const outlook = surveyEnergyOutlook({
			storedEnergy: 6,
			lastUpdatedAtMs: 0,
			nowMs: 0
		});

		expect(outlook.canScanNow).toBe(false);
		expect(outlook.minutesUntilNextScan).toBe(
			Math.ceil((FAMILY_SCAN_ENERGY_COST - 6) / SURVEY_ENERGY_REGEN_PER_MINUTE)
		);
		expect(outlook.canSampleNow).toBe(false);
		expect(outlook.minutesUntilNextSample).toBe(
			Math.ceil((SAMPLE_ENERGY_COST - 6) / SURVEY_ENERGY_REGEN_PER_MINUTE)
		);
	});

	it('applies regen before computing outlook', () => {
		const outlook = surveyEnergyOutlook({
			storedEnergy: 0,
			lastUpdatedAtMs: 0,
			nowMs: 5 * 60_000
		});

		expect(outlook.canScanNow).toBe(true);
		expect(outlook.minutesUntilNextScan).toBe(0);
	});
});
