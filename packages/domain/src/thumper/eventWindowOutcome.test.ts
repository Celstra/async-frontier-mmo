import { describe, expect, it } from 'vitest';
import {
	describeEventWindowStakes,
	formatEventWindowOutcomeLine,
	resolveEventWindowOutcome
} from './eventWindowOutcome.js';
import {
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
	it('describes matching action wear without frame-specific bonuses', () => {
		const stakes = describeEventWindowStakes({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			severity: 'minor',
			fieldRepairKitCount: 1,
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		const match = stakes.find((row) => row.id === 'signal_tune')!;
		expect(match.effectLine).toContain(`wears the Drill by ${MATCHING_ACTION_WEAR_CONDITION}`);
		expect(match.effectLine).not.toContain('bonus');
	});

	it('hold stake uses severity-scaled penalty matching claim resolution', () => {
		for (const severity of ['minor', 'serious'] as const) {
			const stakes = describeEventWindowStakes({
				complication: 'pump_strain',
				matchingAction: 'clear_pump_problem',
				severity,
				fieldRepairKitCount: 0,
				currentMeters: baseMeters,
				windowIndex: 2,
				totalWindowCount: 2
			});
			const hold = stakes.find((row) => row.id === 'hold')!;
			expect(hold.effectLine).toContain(severity === 'minor' ? '4–8' : '12–22');
			expect(hold.effectLine).toContain('gear untouched');
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
				currentMeters: { ...baseMeters, projectedRecovery },
				windowIndex: 1,
				totalWindowCount: 2
			});

			const holdWaste = penaltyWasteForResponse(
				complication,
				matchingAction,
				'hold',
				{ severity, onsetMeters: outcome.beforeState }
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
				eventWindows: [{ windowIndex: 1, complication, matchingAction, severity, beforeState: outcome.beforeState }],
				responses: [{ windowIndex: 1, complication, chosenResponse: 'hold' }]
			});

			expect(claim.wasteQuantity).toBe(holdWaste);
			expect(claim.projectedRecovery - claim.recoveredQuantity).toBe(holdWaste);
		}
	});

	it('matching action restores primary meter and records action wear', () => {
		const outcome = resolveEventWindowOutcome({
			complication: 'pump_strain',
			matchingAction: 'clear_pump_problem',
			severity: 'serious',
			chosenResponse: 'clear_pump_problem',
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		expect(outcome.beforeState.pumpFlow).toBe(57);
		expect(outcome.afterState.pumpFlow).toBe(82);
		expect(outcome.recoveryPenalty).toBe(0);
		expect(outcome.frameBonusRecovery).toBe(0);
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
			currentMeters: baseMeters,
			windowIndex: 1,
			totalWindowCount: 2
		});

		const line = formatEventWindowOutcomeLine({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			chosenResponse: 'hold',
			beforeState: outcome.beforeState,
			afterState: outcome.afterState
		});

		expect(line).toBe('Held — projected recovery 113 → 107 units — gear untouched');
	});
});
