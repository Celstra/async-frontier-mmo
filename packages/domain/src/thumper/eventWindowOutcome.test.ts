import { describe, expect, it } from 'vitest';
import {
	describeEventWindowStakes,
	formatEventWindowOutcomeLine,
	resolveEventWindowOutcome
} from './eventWindowOutcome.js';
import {
	holdPenaltyForSeverity,
	MATCHING_ACTION_WEAR_CONDITION
} from './eventWindowSeverity.js';
import { computeRunPartWearDeltas } from './thumperPartModifiers.js';
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
			severity: 'minor',
			pilotFrame: 'recon',
			fieldRepairKitCount: 1,
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});
		const engineerStakes = describeEventWindowStakes({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			severity: 'minor',
			pilotFrame: 'engineer',
			fieldRepairKitCount: 1,
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		const reconMatch = reconStakes.find((row) => row.id === 'signal_tune')!;
		const engineerMatch = engineerStakes.find((row) => row.id === 'signal_tune')!;

		expect(reconMatch.effectLine).toContain('+5 Recon bonus');
		expect(reconMatch.effectLine).toContain(`wears the Drill by ${MATCHING_ACTION_WEAR_CONDITION}`);
		expect(engineerMatch.effectLine).not.toContain('bonus');
	});

	it('hold stake uses severity-scaled penalty matching claim resolution', () => {
		for (const severity of ['minor', 'serious'] as const) {
			const stakes = describeEventWindowStakes({
				complication: 'pump_strain',
				matchingAction: 'clear_pump_problem',
				severity,
				pilotFrame: 'engineer',
				fieldRepairKitCount: 0,
				currentMeters: baseMeters,
				windowIndex: 2,
				totalWindowCount: 2
			});
			const hold = stakes.find((row) => row.id === 'hold')!;
			const expected = holdPenaltyForSeverity(severity);
			expect(hold.effectLine).toContain(String(expected));
			expect(hold.effectLine).toContain('gear is untouched');
		}
	});
});

describe('resolveEventWindowOutcome', () => {
	it('hold penalty matches resolveThumperRunResult waste for each severity', () => {
		for (const severity of ['minor', 'serious'] as const) {
			const complication = 'signal_drift';
			const matchingAction = 'signal_tune';
			const projectedRecovery = 113;

			const outcome = resolveEventWindowOutcome({
				complication,
				matchingAction,
				severity,
				chosenResponse: 'hold',
				pilotFrame: 'recon',
				currentMeters: { ...baseMeters, projectedRecovery },
				windowIndex: 1,
				totalWindowCount: 2
			});

			const holdWaste = penaltyWasteForResponse(
				complication,
				matchingAction,
				'hold',
				severity
			);
			expect(outcome.recoveryPenalty).toBe(holdWaste);
			expect(outcome.beforeState.projectedRecovery - outcome.afterState.projectedRecovery).toBe(
				holdWaste
			);
			expect(outcome.beforeState.severity).toBe(severity);
			expect(outcome.afterState.severity).toBe(severity);

			const claim = resolveThumperRunResult({
				runConfig: {
					targetResourceId: 'veyrith_copper',
					projectedRecovery
				},
				eventWindows: [{ windowIndex: 1, complication, matchingAction, severity }],
				responses: [{ windowIndex: 1, complication, chosenResponse: 'hold' }],
				pilotFrame: 'recon'
			});

			expect(claim.wasteQuantity).toBe(holdWaste);
			expect(claim.projectedRecovery - claim.recoveredQuantity).toBe(holdWaste);
		}
	});

	it('matching action restores primary meter, records frame bonus, and action wear', () => {
		const outcome = resolveEventWindowOutcome({
			complication: 'pump_strain',
			matchingAction: 'clear_pump_problem',
			severity: 'serious',
			chosenResponse: 'clear_pump_problem',
			pilotFrame: 'engineer',
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		expect(outcome.beforeState.pumpFlow).toBe(57);
		expect(outcome.afterState.pumpFlow).toBe(82);
		expect(outcome.recoveryPenalty).toBe(0);
		expect(outcome.frameBonusRecovery).toBe(6);
		expect(outcome.actionWearCondition).toBe(MATCHING_ACTION_WEAR_CONDITION);

		const wearDeltas = computeRunPartWearDeltas(
			[
				{
					windowIndex: 1,
					complication: 'pump_strain',
					chosenResponse: 'clear_pump_problem',
					matchingAction: 'clear_pump_problem'
				}
			],
			{ isPushRun: false }
		);
		expect(wearDeltas.pump.conditionLoss).toBe(3 + MATCHING_ACTION_WEAR_CONDITION);
	});

	it('formats a minor hold outcome line with recovery delta', () => {
		const outcome = resolveEventWindowOutcome({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			severity: 'minor',
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

		expect(line).toBe('Held — projected recovery 113 → 108 units — gear untouched');
	});
});
