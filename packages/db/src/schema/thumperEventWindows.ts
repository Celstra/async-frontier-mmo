import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { thumperRuns } from './thumperRuns.js';

export const thumperEventWindows = pgTable('thumper_event_windows', {
	id: uuid('id').primaryKey().defaultRandom(),
	thumperRunId: uuid('thumper_run_id')
		.notNull()
		.references(() => thumperRuns.id),
	windowIndex: integer('window_index').notNull(),
	complication: text('complication').notNull(),
	matchingAction: text('matching_action').notNull(),
	chosenResponse: text('chosen_response'),
	respondedAt: timestamp('responded_at', { withTimezone: true })
});
