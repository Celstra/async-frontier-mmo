import { FIRST_ASYNC_TAIL_MINUTES, type HullTier } from '../tuning.js';
import { maxRunMinutes } from './hullRunCeiling.js';
import { unlocksFirstAsyncTail } from './hullTier.js';

function exceedsHullCeilingForTail(input: {
	hullTier: HullTier;
	hullIntegrityAtDeploy: number;
	extractionTailMinutes: number;
}): boolean {
	if (input.extractionTailMinutes !== FIRST_ASYNC_TAIL_MINUTES) {
		return false;
	}
	if (!unlocksFirstAsyncTail(input.hullTier)) {
		return false;
	}

	return (
		FIRST_ASYNC_TAIL_MINUTES >
		maxRunMinutes(input.hullTier, input.hullIntegrityAtDeploy) + 0.001
	);
}

/**
 * One-time slice §6 first-async deploy — pending until used, then pinned to that run id.
 */
export function resolveFirstAsyncWaiverActive(input: {
	hullTier: HullTier;
	hullIntegrityAtDeploy: number;
	extractionTailMinutes: number;
	firstAsyncUnlockPending?: boolean;
	waiverRunId?: string | null;
	thumperRunId?: string;
}): boolean {
	if (!exceedsHullCeilingForTail(input)) {
		return false;
	}

	if (input.thumperRunId && input.waiverRunId) {
		return input.thumperRunId === input.waiverRunId;
	}

	return input.firstAsyncUnlockPending === true;
}

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

/** Wall-clock run length before claim — capped by hull ceiling when fail-safe applies. */
export function effectiveThumperRunDurationSeconds(input: {
	hullTier: HullTier;
	hullIntegrityAtDeploy: number;
	plannedDurationSeconds: number;
	extractionTailMinutes?: number;
	firstAsyncWaiverActive?: boolean;
}): number {
	if (input.firstAsyncWaiverActive) {
		return input.plannedDurationSeconds;
	}

	const maxRunSeconds = hullMaxRunSeconds(input.hullTier, input.hullIntegrityAtDeploy);
	return Math.min(input.plannedDurationSeconds, maxRunSeconds);
}

/** True when planned tail exceeds hull ceiling — run ends at hull-out, not full tail. */
export function isHullFailsafeActive(input: {
	hullTier: HullTier;
	hullIntegrityAtDeploy: number;
	plannedDurationSeconds: number;
	extractionTailMinutes?: number;
	firstAsyncWaiverActive?: boolean;
}): boolean {
	return (
		effectiveThumperRunDurationSeconds(input) < input.plannedDurationSeconds
	);
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
	extractionTailMinutes?: number;
	firstAsyncWaiverActive?: boolean;
}): HullFailsafeProrata | HullRunCapacity {
	const maxRunSeconds = hullMaxRunSeconds(input.hullTier, input.hullIntegrityAtDeploy);

	if (input.firstAsyncWaiverActive) {
		return { triggered: false, maxRunSeconds };
	}

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
