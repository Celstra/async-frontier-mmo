import type { FrameId } from 'shared';
import { describe, expect, it } from 'vitest';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
import {
	FIRST_SESSION_PROJECTED_RECOVERY,
	FIRST_SESSION_SCANNER_MINIMUM
} from './resolveFirstSessionThumperRunResult.js';
import { resolveThumperRunResult } from './resolveThumperRunResult.js';

const firstSessionWindows = generateFirstSessionEventWindows({
	targetResourceId: 'veyrith_copper'
}).windows;

const firstSessionConfig = {
	targetResourceId: 'veyrith_copper' as const,
	projectedRecovery: FIRST_SESSION_PROJECTED_RECOVERY,
	recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM,
	runSeed: 'tutorial-veyrith'
};

function resolveFirstSession(
	responses: Array<{
		windowIndex: number;
		complication: 'signal_drift' | 'pump_strain';
		chosenResponse: 'signal_tune' | 'clear_pump_problem' | 'hold';
	}>,
	pilotFrame: FrameId
) {
	return resolveThumperRunResult({
		runConfig: firstSessionConfig,
		eventWindows: firstSessionWindows,
		responses,
		pilotFrame
	});
}

const perfectResponses = [
	{ windowIndex: 1, complication: 'signal_drift' as const, chosenResponse: 'signal_tune' as const },
	{
		windowIndex: 2,
		complication: 'pump_strain' as const,
		chosenResponse: 'clear_pump_problem' as const
	}
];

describe('resolveThumperRunResult', () => {
	it('matching frame resolves better than a non-matching frame for the same window response', () => {
		const reconSignal = resolveFirstSession(
			[perfectResponses[0], { windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }],
			'recon'
		);
		const engineerSignal = resolveFirstSession(
			[perfectResponses[0], { windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }],
			'engineer'
		);

		expect(reconSignal.recoveredQuantity).toBeGreaterThan(engineerSignal.recoveredQuantity);
		expect(reconSignal.wasteQuantity).toBe(engineerSignal.wasteQuantity);

		const engineerPump = resolveFirstSession(perfectResponses, 'engineer');
		const reconPump = resolveFirstSession(perfectResponses, 'recon');

		expect(engineerPump.recoveredQuantity).toBeGreaterThan(reconPump.recoveredQuantity);
		expect(engineerPump.wasteQuantity).toBe(0);
		expect(reconPump.wasteQuantity).toBe(0);
	});

	it('hold applies a bounded, predictable waste penalty', () => {
		const withHold = resolveFirstSession(
			[
				perfectResponses[0],
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			],
			'recon'
		);
		const perfect = resolveFirstSession(perfectResponses, 'recon');

		expect(withHold.wasteQuantity).toBe(15);
		expect(withHold.recoveredQuantity).toBe(perfect.recoveredQuantity - 15);
		expect(withHold.targetResourceId).toBe('veyrith_copper');
		expect(withHold).not.toHaveProperty('stats');
	});

	it('is deterministic for the same run seed, choices, and frame', () => {
		const input = {
			runConfig: firstSessionConfig,
			eventWindows: firstSessionWindows,
			responses: perfectResponses,
			pilotFrame: 'engineer' as const
		};

		const first = resolveThumperRunResult(input);
		const second = resolveThumperRunResult(input);

		expect(second).toEqual(first);
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
			],
			pilotFrame: 'engineer'
		});

		expect(result.wasteQuantity).toBe(0);
		expect(result.recoveredQuantity).toBe(66);
	});

	it('applies recovery floor when penalties would recover too little', () => {
		const result = resolveFirstSession(
			[
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'hold' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			],
			'vanguard'
		);

		expect(result.recoveredQuantity).toBeGreaterThanOrEqual(FIRST_SESSION_SCANNER_MINIMUM);
		expect(result.explanation).toContain('Recovery floor');
	});
});
