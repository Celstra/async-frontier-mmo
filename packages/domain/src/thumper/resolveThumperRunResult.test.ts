import { describe, expect, it } from 'vitest';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
import {
	FIRST_SESSION_PROJECTED_RECOVERY,
	FIRST_SESSION_SCANNER_MINIMUM
} from './resolveFirstSessionThumperRunResult.js';
import {
	resolveThumperRunResult,
	type ThumperEventWindowSnapshot
} from './resolveThumperRunResult.js';

const firstSessionWindows = generateFirstSessionEventWindows({
	targetResourceId: 'veyrith_copper'
}).windows as ThumperEventWindowSnapshot[];

const firstSessionConfig = {
	targetResourceId: 'veyrith_copper' as const,
	projectedRecovery: FIRST_SESSION_PROJECTED_RECOVERY,
	recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM,
	runSeed: 'tutorial-veyrith'
};

const perfectResponses = [
	{ windowIndex: 1, complication: 'signal_drift' as const, chosenResponse: 'signal_tune' as const },
	{
		windowIndex: 2,
		complication: 'pump_strain' as const,
		chosenResponse: 'clear_pump_problem' as const
	}
];

function resolveFirstSession(
	responses: Array<{
		windowIndex: number;
		complication: 'signal_drift' | 'pump_strain';
		chosenResponse: 'signal_tune' | 'clear_pump_problem' | 'hold';
	}>
) {
	return resolveThumperRunResult({
		runConfig: firstSessionConfig,
		eventWindows: firstSessionWindows,
		responses
	});
}

describe('resolveThumperRunResult', () => {
	it('matching actions resolve with zero waste', () => {
		const perfect = resolveFirstSession(perfectResponses);
		expect(perfect.wasteQuantity).toBe(0);
		expect(perfect.recoveredQuantity).toBe(FIRST_SESSION_PROJECTED_RECOVERY);
	});

	it('hold applies a bounded, predictable waste penalty', () => {
		const withHold = resolveFirstSession([
			perfectResponses[0],
			{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
		]);
		const perfect = resolveFirstSession(perfectResponses);

		expect(withHold.wasteQuantity).toBe(5);
		expect(withHold.recoveredQuantity).toBe(perfect.recoveredQuantity - 5);
		expect(withHold.targetResourceId).toBe('veyrith_copper');
	});

	it('is deterministic for the same run seed and choices', () => {
		const input = {
			runConfig: firstSessionConfig,
			eventWindows: firstSessionWindows,
			responses: perfectResponses
		};

		expect(resolveThumperRunResult(input)).toEqual(resolveThumperRunResult(input));
	});

	it('uses stored matchingAction as frozen truth, not the current complication map', () => {
		const result = resolveThumperRunResult({
			runConfig: {
				targetResourceId: 'veyrith_copper',
				projectedRecovery: 60
			},
			eventWindows: [
				{
					windowIndex: 1,
					complication: 'signal_drift',
					matchingAction: 'clear_pump_problem'
				}
			],
			responses: [
				{
					windowIndex: 1,
					complication: 'signal_drift',
					chosenResponse: 'clear_pump_problem'
				}
			]
		});

		expect(result.wasteQuantity).toBe(0);
		expect(result.recoveredQuantity).toBe(60);
	});

	it('first-session double-hold still recovers enough for scanner conductive_core', () => {
		const result = resolveFirstSession([
			{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'hold' },
			{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
		]);

		expect(result.recoveredQuantity).toBeGreaterThanOrEqual(FIRST_SESSION_SCANNER_MINIMUM);
	});

	it('applies recovery floor when penalties would recover too little', () => {
		const result = resolveThumperRunResult({
			runConfig: {
				targetResourceId: 'veyrith_copper',
				projectedRecovery: 35,
				recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM
			},
			eventWindows: firstSessionWindows,
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'hold' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			]
		});

		expect(result.recoveredQuantity).toBe(FIRST_SESSION_SCANNER_MINIMUM);
		expect(result.explanation).toContain('Recovery floor');
	});

	it('flags hull fail-safe recall with pro-rata yield when hull cannot sustain planned duration', () => {
		const result = resolveThumperRunResult({
			runConfig: {
				targetResourceId: 'keth_iron',
				projectedRecovery: 60,
				hullTier: 'scavenged',
				hullIntegrityAtDeploy: 5,
				plannedDurationSeconds: 15 * 60
			},
			eventWindows: [],
			responses: []
		});

		expect(result.recallReason).toBe('hull_failsafe');
		expect(result.resolutionType).toBe('recalled');
		expect(result.recoveredQuantity).toBeLessThan(60);
	});
});
