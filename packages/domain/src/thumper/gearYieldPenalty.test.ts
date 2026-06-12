import { describe, expect, it } from 'vitest';
import { buildGearYieldPenaltySummary } from './gearYieldPenalty.js';

describe('buildGearYieldPenaltySummary', () => {
	it('reports no penalty when gear performance is full', () => {
		const summary = buildGearYieldPenaltySummary({
			isPushRun: false,
			trueConcentrationPercent: 67,
			extractionTailMinutes: 60,
			partModifiers: { pumpRecoveryBonus: 0, performanceMultiplier: 1 }
		});

		expect(summary.isPenalized).toBe(false);
		expect(summary.unitsLostToWear).toBe(0);
		expect(summary.performancePercent).toBe(100);
	});

	it('quantifies yield lost to worn thumper parts', () => {
		const summary = buildGearYieldPenaltySummary({
			isPushRun: true,
			trueConcentrationPercent: 76,
			extractionTailMinutes: 60,
			partModifiers: { pumpRecoveryBonus: 0, performanceMultiplier: 0.8 }
		});

		expect(summary.isPenalized).toBe(true);
		expect(summary.unitsLostToWear).toBeGreaterThan(0);
		expect(summary.projectedRecovery).toBeLessThan(summary.recoveryAtFullPerformance);
		expect(summary.performancePercent).toBe(80);
	});
});
