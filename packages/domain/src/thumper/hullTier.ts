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
