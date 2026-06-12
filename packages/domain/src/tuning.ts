/** Sim-locked balance constants — Decision 022 / slice spec §8. Import from here only. */

export const SAMPLE_BASE_YIELD = 5;
export const SAMPLE_DURATION_SECONDS = 10;
export const SPOT_SAMPLE_POOL = 5;
export const ENERGY_CAP_SAMPLES = 10;
export const ENERGY_REGEN_SAMPLES_PER_HOUR = 0.5;

export const HULL_CEILING_EXPONENT = 1.2;

export type HullTier = 'scavenged' | 'patched' | 'basic' | 'strong' | 'exceptional';

export const HULL_TIER_BASE: Record<HullTier, number> = {
	scavenged: 75,
	patched: 30,
	basic: 240,
	strong: 480,
	exceptional: 700
};

/** Player-facing tail picker (20-min tier cut — sim non-choice). */
export const RUN_TAILS_MINUTES = [15, 60, 240] as const;

/** Slice §6 first real async tail — unlocked on scavenged/patched hull despite formula ceiling. */
export const FIRST_ASYNC_TAIL_MINUTES = RUN_TAILS_MINUTES[0];

export const TUTORIAL_RUN_1_MINUTES = 2;
export const TUTORIAL_RUN_2_MINUTES = 5;
export const TUTORIAL_RUN_1_YIELD_FLOOR = 25;
export const TUTORIAL_RUN_2_YIELD = 60;

/** 20→15 after the post-build energy audit: worst-case tutorial bill (scans + paid
 * samples at range-floor concentrations) must fit the energy cap with at least one
 * spare sample of headroom. See tutorialEnergyBudget.test.ts. */
export const TUTORIAL_ORDER_SA_STACK = 15;
export const TUTORIAL_ORDER_CM_STACK = 12;

/** Post-tutorial foreman board — bigger stacks (slice spec §6 async reveal). */
export const NEXT_NEED_ORDER_SA_STACK = 30;
export const NEXT_NEED_ORDER_CM_STACK = 18;

export const EVENT_WINDOW_SLOTS = { short: 2, push: 3 } as const;
export const EVENT_WINDOW_FIRE_CHANCE = 0.55;

export const SCAVENGED_HULL_INTEGRITY = 5;
/** Foreman free patch — restores both integrity and condition (slice §6). */
export const PATCHED_HULL_INTEGRITY = 30;
export const PATCHED_HULL_CONDITION = PATCHED_HULL_INTEGRITY;
