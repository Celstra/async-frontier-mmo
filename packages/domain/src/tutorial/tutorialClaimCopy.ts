import { TUTORIAL_RUN_1_YIELD_FLOOR } from '../tuning.js';

/** Slice spec §6 — verbatim hull fail-safe claim banner on FIELD. */
export function tutorialHullFailsafeClaimBanner(
	recoveredQuantity: number = TUTORIAL_RUN_1_YIELD_FLOOR
): string {
	return `RIG SECURED — fail-safe nominal. Hull integrity spent. Partial yield recovered: ${recoveredQuantity}u (scripted floor — never empty-handed).`;
}
