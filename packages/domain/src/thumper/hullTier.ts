import {
	PATCHED_HULL_INTEGRITY,
	SCAVENGED_HULL_INTEGRITY,
	type HullTier
} from '../tuning.js';

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
export function hullDeployWarningLine(integrity: number): string | null {
	const tier = hullTierFromIntegrity(integrity);
	if (tier === 'scavenged') {
		return 'Scavenged hull: the rig will secure itself early and recover partial yield.';
	}
	if (tier === 'patched') {
		return 'Patched hull: short run ceiling — fail-safe may recall this run early.';
	}
	return null;
}
