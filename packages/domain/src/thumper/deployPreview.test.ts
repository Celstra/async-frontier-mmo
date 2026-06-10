import { describe, expect, it } from 'vitest';
import {
	buildDeployPreview,
	computeDeployProjectedRecovery,
	extractionTailYieldMultiplier,
	totalRunDurationSeconds
} from './deployPreview.js';
import { DEFAULT_PROJECTED_RECOVERY } from './generateSeededThumperEventWindows.js';

describe('deployPreview', () => {
	it('applies sublinear extraction tail yield', () => {
		expect(extractionTailYieldMultiplier(15)).toBeCloseTo(0.5, 2);
		expect(extractionTailYieldMultiplier(60)).toBeCloseTo(1, 2);
		expect(extractionTailYieldMultiplier(240)).toBeCloseTo(2, 2);
	});

	it('includes active phase plus tail in total duration', () => {
		expect(totalRunDurationSeconds(60, 60)).toBe(3660);
	});

	it('raises projected recovery for richer sampled spots and longer tails', () => {
		const poor = computeDeployProjectedRecovery({
			baseProjectedRecovery: DEFAULT_PROJECTED_RECOVERY,
			trueConcentrationPercent: 40,
			extractionTailMinutes: 15
		});
		const rich = computeDeployProjectedRecovery({
			baseProjectedRecovery: DEFAULT_PROJECTED_RECOVERY,
			trueConcentrationPercent: 94,
			extractionTailMinutes: 240
		});
		expect(rich).toBeGreaterThan(poor);
	});

	it('returns deterministic run meter preview', () => {
		const preview = buildDeployPreview({
			trueConcentrationPercent: 67,
			extractionTailMinutes: 60,
			isPushRun: false,
			partModifiers: { pumpRecoveryBonus: 0, performanceMultiplier: 1 },
			surveyClarityScore: 0,
			equippedParts: {
				drill: { displayName: 'Worn Basic Drill', condition: 80, integrity: 100 },
				pump: { displayName: 'Worn Basic Pump', condition: 75, integrity: 100 },
				hull: { displayName: 'Worn Basic Hull', condition: 85, integrity: 100 }
			}
		});

		expect(preview.projectedRecovery).toBe(60);
		expect(preview.signalLock).toBeGreaterThan(0);
		expect(preview.pumpFlow).toBeGreaterThan(0);
		expect(preview.threatPressure).toBe(24);
		expect(preview.hullCondition).toBe(85);
	});
});
