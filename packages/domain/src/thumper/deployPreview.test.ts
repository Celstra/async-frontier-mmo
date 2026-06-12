import { describe, expect, it } from 'vitest';
import {
	ACTIVE_PHASE_SECONDS,
	buildDeployPreview,
	computeDeployProjectedRecovery,
	effectiveExtractionTailYieldMultiplier,
	extractionTailYieldMultiplier,
	parseExtractionTailMinutes,
	projectedRecoveryForStoredRun,
	TUTORIAL_EXTRACTION_TAIL_OPTION,
	totalRunDurationSeconds
} from './deployPreview.js';
import { DEFAULT_PROJECTED_RECOVERY } from './generateSeededThumperEventWindows.js';
import {
	FIRST_SESSION_SCANNER_MINIMUM,
	resolveFirstSessionThumperRunResult
} from './resolveFirstSessionThumperRunResult.js';

describe('deployPreview', () => {
	it('applies sublinear extraction tail yield', () => {
		expect(extractionTailYieldMultiplier(15)).toBeCloseTo(0.5, 2);
		expect(extractionTailYieldMultiplier(60)).toBeCloseTo(1, 2);
		expect(extractionTailYieldMultiplier(240)).toBeCloseTo(2, 2);
	});

	it('includes active phase plus tail in total duration', () => {
		expect(totalRunDurationSeconds(60, 60)).toBe(3660);
	});

	it('tutorial run totals 180 seconds (60s active + 2m tail)', () => {
		expect(
			totalRunDurationSeconds(ACTIVE_PHASE_SECONDS, TUTORIAL_EXTRACTION_TAIL_OPTION.minutes)
		).toBe(180);
	});

	it('exempts tutorial tail from sublinear yield penalty', () => {
		expect(extractionTailYieldMultiplier(2)).toBeCloseTo(0.183, 2);
		expect(effectiveExtractionTailYieldMultiplier(2, true)).toBe(1);
		expect(effectiveExtractionTailYieldMultiplier(2, false)).toBeCloseTo(0.183, 2);
	});

	it('tutorial 2m projected recovery matches 1h baseline', () => {
		const withTutorial2m = computeDeployProjectedRecovery({
			baseProjectedRecovery: DEFAULT_PROJECTED_RECOVERY,
			trueConcentrationPercent: 67,
			extractionTailMinutes: 2,
			isTutorialRun: true
		});
		const with1h = computeDeployProjectedRecovery({
			baseProjectedRecovery: DEFAULT_PROJECTED_RECOVERY,
			trueConcentrationPercent: 67,
			extractionTailMinutes: 60
		});
		expect(withTutorial2m).toBe(with1h);
	});

	it('rejects non-tutorial 2m tail input (coerces to 60 min default)', () => {
		expect(parseExtractionTailMinutes('2m')).toBe(60);
		expect(parseExtractionTailMinutes('2m', { isTutorialRun: true })).toBe(2);
	});

	it('tutorial stored run with 2m tail clears scanner conductive core on claim', () => {
		const projectedRecovery = projectedRecoveryForStoredRun({
			isPushRun: false,
			trueConcentrationPercent: 94,
			extractionTailMinutes: TUTORIAL_EXTRACTION_TAIL_OPTION.minutes,
			isTutorialRun: true
		});

		const result = resolveFirstSessionThumperRunResult({
			targetResourceId: 'veyrith_copper',
			pilotFrame: 'recon',
			projectedRecovery,
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'hold' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			]
		});

		expect(result.recoveredQuantity).toBeGreaterThanOrEqual(FIRST_SESSION_SCANNER_MINIMUM);
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
