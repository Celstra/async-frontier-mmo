import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { items } from './items.js';
import { pilots } from './pilots.js';
import { thumperRuns } from './thumperRuns.js';

/** Audit record for explicit repair-kit use (Decision 012). */
export const repairActions = pgTable('repair_actions', {
	id: uuid('id').primaryKey().defaultRandom(),
	pilotId: text('pilot_id')
		.notNull()
		.references(() => pilots.id),
	repairKitItemId: uuid('repair_kit_item_id')
		.notNull()
		.references(() => items.id),
	thumperRunId: uuid('thumper_run_id').references(() => thumperRuns.id),
	thumperEventWindowIndex: integer('thumper_event_window_index'),
	context: text('context').notNull(),
	conditionBefore: integer('condition_before').notNull(),
	conditionAfter: integer('condition_after').notNull(),
	integrityBefore: integer('integrity_before').notNull(),
	integrityAfter: integer('integrity_after').notNull(),
	kitConditionRestoredScore: integer('kit_condition_restored_score').notNull(),
	kitIntegritySafetyScore: integer('kit_integrity_safety_score').notNull(),
	explanation: text('explanation').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
