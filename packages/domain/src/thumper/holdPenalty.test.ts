import { describe, expect, it } from 'vitest';
import {
	holdPenaltyForResponse,
	holdPenaltyRangeLabel,
	meterLambdaForComplication,
	TUTORIAL_HOLD_PENALTY_BY_SEVERITY
} from './holdPenalty.js';

describe('holdPenaltyForResponse', () => {
	const meters = {
		signalLock: 90,
		pumpFlow: 50,
		threatPressure: 50,
		hullCondition: 50,
		projectedRecovery: 60
	};

	it('lands near the floor when the relevant meter is high', () => {
		const penalty = holdPenaltyForResponse({
			severity: 'minor',
			complication: 'signal_drift',
			meters
		});
		expect(penalty).toBeGreaterThanOrEqual(4);
		expect(penalty).toBeLessThanOrEqual(6);
	});

	it('lands near the ceiling when the relevant meter is low', () => {
		const penalty = holdPenaltyForResponse({
			severity: 'minor',
			complication: 'signal_drift',
			meters: { ...meters, signalLock: 10 }
		});
		expect(penalty).toBeGreaterThanOrEqual(7);
		expect(penalty).toBeLessThanOrEqual(8);
	});

	it('uses fixed tutorial penalties', () => {
		expect(
			holdPenaltyForResponse({
				severity: 'minor',
				complication: 'signal_drift',
				meters,
				tutorialDeterministic: true
			})
		).toBe(TUTORIAL_HOLD_PENALTY_BY_SEVERITY.minor);
	});

	it('exposes readable hold ranges for UI', () => {
		expect(holdPenaltyRangeLabel('serious')).toBe('12–22');
		expect(meterLambdaForComplication(meters, 'pump_strain')).toBe(0.5);
	});

	it('threat_surge inverts: high threatPressure → severe penalty (toward 22), low → mild (toward 12)', () => {
		// High threatPressure (90) → high danger → lambda = 1 - 0.9 = 0.1 → near ceiling
		const highThreatPenalty = holdPenaltyForResponse({
			severity: 'serious',
			complication: 'threat_surge',
			meters: { ...meters, threatPressure: 90 }
		});
		expect(highThreatPenalty).toBeGreaterThanOrEqual(20);
		expect(highThreatPenalty).toBeLessThanOrEqual(22);

		// Low threatPressure (10) → low danger → lambda = 1 - 0.1 = 0.9 → near floor
		const lowThreatPenalty = holdPenaltyForResponse({
			severity: 'serious',
			complication: 'threat_surge',
			meters: { ...meters, threatPressure: 10 }
		});
		expect(lowThreatPenalty).toBeGreaterThanOrEqual(12);
		expect(lowThreatPenalty).toBeLessThanOrEqual(14);

		// signal_drift still behaves normally: high signalLock → mild penalty (toward floor)
		const highSignalPenalty = holdPenaltyForResponse({
			severity: 'serious',
			complication: 'signal_drift',
			meters: { ...meters, signalLock: 90 }
		});
		expect(highSignalPenalty).toBeGreaterThanOrEqual(12);
		expect(highSignalPenalty).toBeLessThanOrEqual(14);
	});
});
