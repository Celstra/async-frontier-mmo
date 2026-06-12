import { describe, expect, it } from 'vitest';
import {
	accrueEnergy,
	FAMILY_SCAN_ENERGY_COST,
	SAMPLE_ENERGY_COST,
	SURVEY_ENERGY_CAP
} from './prospectingSampling.js';
import { ENERGY_REGEN_SAMPLES_PER_HOUR } from '../tuning.js';
import { surveyEnergyOutlook } from './surveyEnergyOutlook.js';

describe('surveyEnergyOutlook', () => {
	it('reports full energy as immediately actionable', () => {
		const outlook = surveyEnergyOutlook({
			storedEnergy: SURVEY_ENERGY_CAP,
			lastUpdatedAtMs: 0,
			nowMs: 0
		});

		expect(outlook.regenSamplesPerHour).toBe(ENERGY_REGEN_SAMPLES_PER_HOUR);
		expect(outlook.hoursUntilFull).toBe(0);
		expect(outlook.canScanNow).toBe(true);
		expect(outlook.canSampleNow).toBe(true);
		expect(outlook.hoursUntilNextScan).toBe(0);
		expect(outlook.hoursUntilNextSample).toBe(0);
	});

	it('computes hours until scan and sample from a partial pool', () => {
		const regenPerHour = ENERGY_REGEN_SAMPLES_PER_HOUR * SAMPLE_ENERGY_COST;
		const outlook = surveyEnergyOutlook({
			storedEnergy: 6,
			lastUpdatedAtMs: 0,
			nowMs: 0
		});

		expect(outlook.canScanNow).toBe(false);
		expect(outlook.hoursUntilNextScan).toBeCloseTo(
			(FAMILY_SCAN_ENERGY_COST - 6) / regenPerHour
		);
		expect(outlook.canSampleNow).toBe(false);
		expect(outlook.hoursUntilNextSample).toBeCloseTo(
			(SAMPLE_ENERGY_COST - 6) / regenPerHour
		);
	});

	it('accrues energy continuously and clamps to cap', () => {
		const accrued = accrueEnergy({ rawEnergy: 0, updatedAtMs: 0 }, 2 * 3_600_000);
		expect(accrued.rawEnergy).toBeGreaterThan(0);
		expect(accrued.rawEnergy).toBeLessThanOrEqual(SURVEY_ENERGY_CAP);

		const outlook = surveyEnergyOutlook({
			storedEnergy: 0,
			lastUpdatedAtMs: 0,
			nowMs: 24 * 3_600_000
		});
		expect(outlook.canSampleNow).toBe(true);
	});
});
