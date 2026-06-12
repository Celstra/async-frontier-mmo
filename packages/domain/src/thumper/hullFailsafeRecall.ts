import type { HullTier } from '../tuning.js';
import { maxRunMinutes } from './hullRunCeiling.js';

export type HullFailsafeRecallReason = 'hull_failsafe';

export type HullFailsafeProrata = {
	triggered: true;
	recallReason: HullFailsafeRecallReason;
	maxRunSeconds: number;
	plannedDurationSeconds: number;
	durationFraction: number;
	prorataProjectedRecovery: number;
};

export type HullRunCapacity = {
	triggered: false;
	maxRunSeconds: number;
};

export function hullMaxRunSeconds(tier: HullTier, integrityPct: number): number {
	return maxRunMinutes(tier, integrityPct) * 60;
}

/**
 * Hull 0% = fail-safe auto-recall: run ends at hull-out time with pro-rata yield kept.
 * When planned duration fits within the hull ceiling, no failsafe applies.
 */
export function computeHullFailsafeProrata(input: {
	hullTier: HullTier;
	hullIntegrityAtDeploy: number;
	plannedDurationSeconds: number;
	projectedRecovery: number;
}): HullFailsafeProrata | HullRunCapacity {
	const maxRunSeconds = hullMaxRunSeconds(input.hullTier, input.hullIntegrityAtDeploy);

	if (input.plannedDurationSeconds <= maxRunSeconds) {
		return { triggered: false, maxRunSeconds };
	}

	const durationFraction = maxRunSeconds / input.plannedDurationSeconds;

	return {
		triggered: true,
		recallReason: 'hull_failsafe',
		maxRunSeconds,
		plannedDurationSeconds: input.plannedDurationSeconds,
		durationFraction,
		prorataProjectedRecovery: Math.max(
			0,
			Math.round(input.projectedRecovery * durationFraction)
		)
	};
}
