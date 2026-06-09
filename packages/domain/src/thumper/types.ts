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

export type ThumperEventWindow = {
	/** 1-based order in the run (window 1, window 2, …). */
	windowIndex: number;
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
};

export type ThumperEventWindowPlan = {
	windows: ThumperEventWindow[];
	/** The four MVP event actions (for menus / validation). */
	eventActions: readonly ThumperEventActionId[];
	/** Always includes recall_early; separate from eventActions. */
	safetyChoices: readonly ThumperSafetyChoiceId[];
};
