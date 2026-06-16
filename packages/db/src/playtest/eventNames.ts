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
	'first_survey_started',
	'first_survey_completed',
	'signal_compared',
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
	'slot_selection_changed',
	'tuning_allocation_changed',
	'repair_previewed',
	'first_stat_reveal_viewed',
	'mission_order_nudge_shown',
	/** Repeatable diagnostic events for playtest reconstruction. */
	'field_sample_completed',
	'next_action_resolved',
	'deploy_attempted',
	'active_run_panel_rendered',
	'rig_event_response_submitted',
	'workshop_station_viewed',
	'tutorial_recovery_state',
	'craft_result_reveal_seen',
	'craft_result_pulse_viewed',
	'craft_result_compare_clicked',
	'craft_result_install_confirmed',
	'craft_result_craft_another_clicked',
	'craft_result_abandoned',
	'overdrive_crit_scrap_seen',
	'item_favorited',
	'item_unfavorited',
	'item_reclaim_previewed',
	'item_reclaimed',
	'supply_crate_available',
	'supply_crate_opened',
	'workshop_started',
	'starter_resources_viewed',
	'schematic_selected',
	'resource_slot_filled',
	'resource_slot_replaced',
	'tuning_changed',
	'experiment_pulse_configured',
	'craft_started',
	'craft_completed',
	'result_compared',
	'repeat_same_schematic',
	'crafted_each_thumper_part',
	'no_craftable_resources_state',
	/** One-time state — first post-async 15m deploy on scavenged/patched hull (not a funnel metric). */
	'first_async_deploy_used'
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

/**
 * Event names that were emitted in earlier iterations but are no longer produced
 * by any active code path. Kept here for historical-data queries; NOT part of the
 * {@link PlaytestEventName} union so that typos in active code are caught at
 * compile time rather than silently treated as valid.
 */
export const LEGACY_PLAYTEST_EVENTS = [
	'frame_chosen',
	'veyrith_copper_recommended',
	'two_resources_compared',
	'spots_sampled_before_deploy',
	'extraction_tail_chosen'
] as const;
