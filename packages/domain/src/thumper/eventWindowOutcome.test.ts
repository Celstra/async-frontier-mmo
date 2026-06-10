import { describe, expect, it } from 'vitest';
import {
	describeEventWindowStakes,
	formatEventWindowOutcomeLine,
	resolveEventWindowOutcome
} from './eventWindowOutcome.js';
import { penaltyWasteForResponse } from './thumperWindowResolution.js';
import { resolveThumperRunResult } from './resolveThumperRunResult.js';
import type { EventWindowMeterSnapshot } from './eventWindowOutcome.js';

const baseMeters: EventWindowMeterSnapshot = {
	projectedRecovery: 113,
	signalLock: 90,
	pumpFlow: 82,
	threatPressure: 24,
	hullCondition: 88
};

describe('describeEventWindowStakes', () => {
	it('shows different frame bonus on matching action for recon vs engineer', () => {
		const reconStakes = describeEventWindowStakes({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			pilotFrame: 'recon',
			fieldRepairKitCount: 1,
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});
		const engineerStakes = describeEventWindowStakes({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			pilotFrame: 'engineer',
			fieldRepairKitCount: 1,
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		const reconMatch = reconStakes.find((row) => row.id === 'signal_tune')!;
		const engineerMatch = engineerStakes.find((row) => row.id === 'signal_tune')!;

		expect(reconMatch.effectLine).toContain('+5 Recon bonus');
		expect(engineerMatch.effectLine).not.toContain('bonus');
	});

	it('hold stake uses the same penalty number as penaltyWasteForResponse', () => {
		const stakes = describeEventWindowStakes({
			complication: 'pump_strain',
			matchingAction: 'clear_pump_problem',
			pilotFrame: 'engineer',
			fieldRepairKitCount: 0,
			currentMeters: baseMeters,
			windowIndex: 2,
			totalWindowCount: 2
		});
		const hold = stakes.find((row) => row.id === 'hold')!;
		const expected = penaltyWasteForResponse('pump_strain', 'clear_pump_problem', 'hold');
		expect(hold.effectLine).toContain(String(expected));
	});
});

describe('resolveEventWindowOutcome', () => {
	it('hold penalty matches resolveThumperRunResult waste for the same inputs', () => {
		const complication = 'signal_drift';
		const matchingAction = 'signal_tune';
		const projectedRecovery = 113;

		const outcome = resolveEventWindowOutcome({
			complication,
			matchingAction,
			chosenResponse: 'hold',
			pilotFrame: 'recon',
			currentMeters: { ...baseMeters, projectedRecovery },
			windowIndex: 1,
			totalWindowCount: 2
		});

		const holdWaste = penaltyWasteForResponse(complication, matchingAction, 'hold');
		expect(outcome.recoveryPenalty).toBe(holdWaste);
		expect(outcome.beforeState.projectedRecovery - outcome.afterState.projectedRecovery).toBe(
			holdWaste
		);

		const claim = resolveThumperRunResult({
			runConfig: {
				targetResourceId: 'veyrith_copper',
				projectedRecovery
			},
			eventWindows: [{ windowIndex: 1, complication, matchingAction }],
			responses: [{ windowIndex: 1, complication, chosenResponse: 'hold' }],
			pilotFrame: 'recon'
		});

		expect(claim.wasteQuantity).toBe(holdWaste);
		expect(claim.projectedRecovery - claim.recoveredQuantity).toBe(holdWaste);
	});

	it('matching action restores primary meter and records frame bonus', () => {
		const outcome = resolveEventWindowOutcome({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			chosenResponse: 'signal_tune',
			pilotFrame: 'recon',
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		expect(outcome.beforeState.signalLock).toBe(62);
		expect(outcome.afterState.signalLock).toBe(90);
		expect(outcome.recoveryPenalty).toBe(0);
		expect(outcome.frameBonusRecovery).toBe(5);
		expect(outcome.afterState.projectedRecovery).toBe(baseMeters.projectedRecovery);
	});

	it('formats a hold outcome line with recovery delta', () => {
		const outcome = resolveEventWindowOutcome({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			chosenResponse: 'hold',
			pilotFrame: 'recon',
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		const line = formatEventWindowOutcomeLine({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			chosenResponse: 'hold',
			pilotFrame: 'recon',
			beforeState: outcome.beforeState,
			afterState: outcome.afterState
		});

		expect(line).toBe('Held — projected recovery 113 → 103 units');
	});
});
