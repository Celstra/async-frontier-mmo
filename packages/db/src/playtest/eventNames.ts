/** Slice funnel — FIRST_THUMP_SLICE_SPEC § telemetry. */
export const SLICE_FUNNEL_EVENTS = [
	'prologue_done',
	'first_family_chosen',
	'first_scan',
	'first_move',
	'first_sample',
	'first_stat_reveal',
	'second_family_started',
	'turn_in_completed',
	'fabricator_online_seen',
	'rig_assembled',
	'first_deploy',
	'event_window_resolved',
	'first_claim',
	'async_duration_chosen',
	'second_deploy_voluntary',
	'return_visit'
] as const;

/** Decision 013 — locked first-session funnel (exact names). */
export const PLAYTEST_FUNNEL_EVENTS = [
	'frame_chosen',
	'first_survey_started',
	'first_survey_completed',
	'signal_compared',
	'veyrith_copper_recommended',
	'target_signal_selected',
	'thumper_deployed',
	'event_window_1_resolved',
	'event_window_2_resolved',
	'thumper_claimed',
	'resource_claimed',
	'schematic_opened',
	'resource_slots_filled',
	'tuning_points_spent',
	'craft_mode_chosen',
	'item_crafted',
	'item_equipped',
	'second_survey_completed'
] as const;

/** Decision 013 — comprehension signals (may repeat). */
export const PLAYTEST_COMPREHENSION_EVENTS = [
	'resource_stats_inspected',
	'two_resources_compared',
	'slot_selection_changed',
	'tuning_allocation_changed',
	'repair_previewed',
	'spots_sampled_before_deploy',
	'extraction_tail_chosen',
	'first_stat_reveal_viewed'
] as const;

export const PLAYTEST_EVENT_NAMES = [
	...SLICE_FUNNEL_EVENTS,
	...PLAYTEST_FUNNEL_EVENTS,
	...PLAYTEST_COMPREHENSION_EVENTS
] as const;

export type PlaytestEventName = (typeof PLAYTEST_EVENT_NAMES)[number];

const PLAYTEST_EVENT_NAME_SET = new Set<string>(PLAYTEST_EVENT_NAMES);

export function isPlaytestEventName(value: string): value is PlaytestEventName {
	return PLAYTEST_EVENT_NAME_SET.has(value);
}
