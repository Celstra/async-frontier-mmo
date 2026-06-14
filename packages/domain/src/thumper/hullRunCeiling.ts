import {
	FIRST_ASYNC_TAIL_MINUTES,
	HULL_CEILING_EXPONENT,
	HULL_TIER_BASE,
	RUN_TAILS_MINUTES,
	TUTORIAL_RUN_1_MINUTES,
	TUTORIAL_RUN_2_MINUTES,
	type HullTier
} from '../tuning.js';
import { unlocksFirstAsyncTail } from './hullTier.js';

/** Max run length in minutes before hull integrity is spent. */
export function maxRunMinutes(tier: HullTier, integrityPct: number): number {
	const clampedIntegrity = Math.max(0, Math.min(100, integrityPct));
	const base = HULL_TIER_BASE[tier];
	return base * Math.pow(clampedIntegrity / 100, HULL_CEILING_EXPONENT);
}

export type AvailableTailOption = {
	minutes: number;
	label: string;
};

function tailLabel(minutes: number): string {
	if (minutes < 60) {
		return `${minutes} min`;
	}
	if (minutes % 60 === 0 && minutes < 240) {
		return `${minutes / 60} hour`;
	}
	if (minutes === 240) {
		return '4 hours';
	}
	return `${minutes} min`;
}

/**
 * Tails the player may pick at deploy — capped by hull ceiling.
 * Tutorial tails included when requested (scripted first/second deploy).
 */
export function availableTails(
	tier: HullTier,
	integrityPct: number,
	options?: {
		includeTutorialTails?: boolean;
		unlockFirstAsyncTail?: boolean;
		allowFirstHullEmergencyRun?: boolean;
	}
): AvailableTailOption[] {
	const ceiling = maxRunMinutes(tier, integrityPct);
	const candidates: number[] = [...RUN_TAILS_MINUTES];

	if (options?.includeTutorialTails) {
		candidates.unshift(TUTORIAL_RUN_1_MINUTES, TUTORIAL_RUN_2_MINUTES);
	}

	const unique = [...new Set(candidates)].sort((a, b) => a - b);

	let allowed = unique.filter((minutes) => minutes <= ceiling + 0.001);

	if (
		options?.unlockFirstAsyncTail &&
		unlocksFirstAsyncTail(tier) &&
		!allowed.includes(FIRST_ASYNC_TAIL_MINUTES)
	) {
		allowed.push(FIRST_ASYNC_TAIL_MINUTES);
		allowed.sort((a, b) => a - b);
	}

	if (
		options?.allowFirstHullEmergencyRun &&
		tier === 'patched' &&
		!allowed.includes(TUTORIAL_RUN_2_MINUTES)
	) {
		allowed.push(TUTORIAL_RUN_2_MINUTES);
		allowed.sort((a, b) => a - b);
	}

	return allowed.map((minutes) => ({ minutes, label: tailLabel(minutes) }));
}
