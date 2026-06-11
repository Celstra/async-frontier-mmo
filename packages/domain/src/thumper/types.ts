import type { EventWindowSeverity } from './eventWindowSeverity.js';

/** Locked MVP complications (Decision 005). Tutorial uses two; types include all four for the pair map. */
export type ThumperComplicationId =
	| 'signal_drift'
	| 'hull_damage'
	| 'threat_surge'
	| 'pump_strain';

/** Locked MVP event actions (Decision 004) — exactly four. */
export type ThumperEventActionId =
	| 'signal_tune'
	| 'field_repair'
	| 'suppress_threat'
	| 'clear_pump_problem';

/** Universal safety choice — not an event action. */
export type ThumperSafetyChoiceId = 'recall_early';

/** Probability that a scheduled event window actually fires an event (owner-approved 2026-06-11). */
export const EVENT_WINDOW_TRIGGER_PROBABILITY = 0.55;

/** A scheduled window that fires an event with a complication. */
export type ThumperEventWindow = {
	/** 1-based order in the run (window 1, window 2, …). */
	windowIndex: number;
	/** Whether this window has an active event or is quiet. */
	quiet: false;
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	severity: EventWindowSeverity;
};

/** A scheduled window where nothing happens — no action needed, no penalty. */
export type ThumperQuietWindow = {
	/** 1-based order in the run (window 1, window 2, …). */
	windowIndex: number;
	quiet: true;
};

/** A scheduled window can either fire an event or be quiet. */
export type ThumperScheduledWindow = ThumperEventWindow | ThumperQuietWindow;

export type ThumperEventWindowPlan = {
	/** All scheduled windows (both event and quiet). Quiet windows are not persisted to DB. */
	windows: ThumperScheduledWindow[];
	/** The four MVP event actions (for menus / validation). */
	eventActions: readonly ThumperEventActionId[];
	/** Always includes recall_early; separate from eventActions. */
	safetyChoices: readonly ThumperSafetyChoiceId[];
};
