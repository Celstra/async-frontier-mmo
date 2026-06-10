/** Locked MVP economy ledger event types (Decision 012). */
export const ECONOMY_LEDGER_EVENT_TYPES = [
	'survey_completed',
	'thumper_deployed',
	'thumper_claimed',
	'resource_granted',
	'resource_consumed',
	'item_crafted',
	'item_equipped',
	'item_condition_changed',
	'repair_kit_consumed',
	'item_repaired'
] as const;

export type EconomyLedgerEventType = (typeof ECONOMY_LEDGER_EVENT_TYPES)[number];
