import {
	PATCHED_HULL_INTEGRITY,
	SCAVENGED_HULL_INTEGRITY,
	type HullTier
} from '../tuning.js';
import { formatMmSs } from '../format/formatMmSs.js';
import { effectiveThumperRunDurationSeconds, isHullFailsafeActive } from './hullFailsafeRecall.js';

/** Map equipped/deployed hull integrity to sim tier — Decision 022 / slice spec §7. */
export function hullTierFromIntegrity(integrity: number): HullTier {
	if (integrity <= SCAVENGED_HULL_INTEGRITY) {
		return 'scavenged';
	}
	if (integrity <= PATCHED_HULL_INTEGRITY) {
		return 'patched';
	}
	return 'basic';
}

/** Scavenged/patched hulls get the slice §6 first-async tail (15m) despite formula ceiling. */
export function unlocksFirstAsyncTail(tier: HullTier): boolean {
	return tier === 'scavenged' || tier === 'patched';
}

/** Player-facing hull integrity line for equip/deploy lists. */
export function hullIntegrityAdvisoryLine(integrity: number): string | null {
	const tier = hullTierFromIntegrity(integrity);
	if (tier !== 'scavenged' && tier !== 'patched') {
		return null;
	}
	return `Integrity ${integrity}% — ${tier}. Fail-safe will recall this run early.`;
}

/** Pre-deploy warning for low-integrity hulls. */
export type HullDeployWarningOptions = {
	plannedDurationSeconds?: number;
	extractionTailMinutes?: number;
	firstAsyncWaiverActive?: boolean;
};

export function hullDeployWarningLine(
	integrity: number,
	options?: number | HullDeployWarningOptions
): string | null {
	const opts: HullDeployWarningOptions =
		typeof options === 'number' ? { plannedDurationSeconds: options } : (options ?? {});

	if (opts.firstAsyncWaiverActive) {
		return null;
	}

	const tier = hullTierFromIntegrity(integrity);
	let base: string | null = null;
	if (tier === 'scavenged') {
		base = 'Scavenged hull: the rig will secure itself early and recover partial yield.';
	} else if (tier === 'patched') {
		base = 'Patched hull: short run ceiling — fail-safe may recall this run early.';
	}
	if (!base || opts.plannedDurationSeconds === undefined) {
		return base;
	}

	const effectiveSeconds = effectiveThumperRunDurationSeconds({
		hullTier: tier,
		hullIntegrityAtDeploy: integrity,
		plannedDurationSeconds: opts.plannedDurationSeconds,
		extractionTailMinutes: opts.extractionTailMinutes,
		firstAsyncWaiverActive: opts.firstAsyncWaiverActive
	});
	if (effectiveSeconds >= opts.plannedDurationSeconds) {
		return base;
	}

	const clock = formatMmSs(effectiveSeconds);
	return `${base} Secures at ~${clock}.`;
}

export function hullFailsafeTripLine(integrity: number, failsafeActive = true): string | null {
	if (!failsafeActive) {
		return null;
	}
	const tier = hullTierFromIntegrity(integrity);
	if (tier !== 'scavenged' && tier !== 'patched') {
		return null;
	}
	return `Integrity ${integrity}% (fail-safe)`;
}

export function hullRunHeaderLine(input: {
	hullCondition: number;
	hullIntegrity: number;
	failsafeActive?: boolean;
}): string {
	const failsafe = hullFailsafeTripLine(input.hullIntegrity, input.failsafeActive !== false);
	if (failsafe) {
		return `HULL — cond ${input.hullCondition}% · ${failsafe}`;
	}
	return `HULL ${input.hullCondition}%`;
}

export { isHullFailsafeActive };
