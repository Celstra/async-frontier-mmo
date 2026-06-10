import { integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { thumperRuns } from './thumperRuns.js';

export const thumperEventWindows = pgTable(
	'thumper_event_windows',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		thumperRunId: uuid('thumper_run_id')
			.notNull()
			.references(() => thumperRuns.id),
		windowIndex: integer('window_index').notNull(),
		complication: text('complication').notNull(),
		matchingAction: text('matching_action').notNull(),
		severity: text('severity').default('minor'),
		chosenResponse: text('chosen_response'),
		respondedAt: timestamp('responded_at', { withTimezone: true }),
		beforeState: jsonb('before_state'),
		afterState: jsonb('after_state')
	},
	(table) => [
		uniqueIndex('thumper_event_windows_run_window_idx').on(
			table.thumperRunId,
			table.windowIndex
		)
	]
);
