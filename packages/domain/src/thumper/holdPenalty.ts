import type { ThumperComplicationId } from './types.js';
import type { EventWindowSeverity } from './eventWindowSeverity.js';

export type HoldPenaltyMeters = {
	signalLock: number;
	pumpFlow: number;
	threatPressure: number;
	hullCondition: number;
};

/** SIM-LOCKED — event_choice_liveness_sim.py Candidate A. */
export const HOLD_PENALTY_RANGES: Record<EventWindowSeverity, readonly [number, number]> = {
	minor: [4, 8],
	serious: [12, 22]
};

/** Tutorial windows keep fixed mid-rolls for teaching beats. */
export const TUTORIAL_HOLD_PENALTY_BY_SEVERITY: Record<EventWindowSeverity, number> = {
	minor: 5,
	serious: 16
};

const COMPLICATION_METER_KEY: Record<
	ThumperComplicationId,
	keyof HoldPenaltyMeters
> = {
	signal_drift: 'signalLock',
	hull_damage: 'hullCondition',
	threat_surge: 'threatPressure',
	pump_strain: 'pumpFlow'
};

function clamp01(value: number): number {
	return Math.max(0, Math.min(1, value));
}

export function meterLambdaForComplication(
	meters: HoldPenaltyMeters,
	complication: ThumperComplicationId
): number {
	const key = COMPLICATION_METER_KEY[complication];
	const safety = clamp01(meters[key] / 100);
	return complication === 'threat_surge' ? 1 - safety : safety;
}

export function holdPenaltyRangeLabel(severity: EventWindowSeverity): string {
	const [lo, hi] = HOLD_PENALTY_RANGES[severity];
	return `${lo}–${hi}`;
}

export function holdPenaltyForResponse(input: {
	severity: EventWindowSeverity;
	complication: ThumperComplicationId;
	meters: HoldPenaltyMeters;
	tutorialDeterministic?: boolean;
}): number {
	if (input.tutorialDeterministic) {
		return TUTORIAL_HOLD_PENALTY_BY_SEVERITY[input.severity];
	}

	const [lo, hi] = HOLD_PENALTY_RANGES[input.severity];
	const lambda = meterLambdaForComplication(input.meters, input.complication);
	return Math.round(lo + (1 - lambda) * (hi - lo));
}
