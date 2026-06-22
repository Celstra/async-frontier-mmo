import { check, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { thumperRuns } from './thumperRuns.js';

export const THUMPER_COMMAND_LOG_COMMANDS = ['drill', 'bank', 'brace', 'vent'] as const;
export type ThumperCommandLogCommand = (typeof THUMPER_COMMAND_LOG_COMMANDS)[number];

/** Committed command-queue entries for claim replay — gameplay rules live in domain. */
export const thumperRunCommandLog = pgTable(
	'thumper_run_command_log',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		runId: uuid('run_id')
			.notNull()
			.references(() => thumperRuns.id, { onDelete: 'cascade' }),
		/** Monotonic queue submission order; replay reads ascending beat_index. */
		beatIndex: integer('beat_index').notNull(),
		command: text('command').notNull(),
		recordedAt: timestamp('recorded_at', { withTimezone: true }).notNull(),
		resolvedAt: timestamp('resolved_at', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('thumper_run_command_log_run_beat_idx').on(table.runId, table.beatIndex),
		check(
			'thumper_run_command_log_command_check',
			sql`${table.command} in ('drill', 'bank', 'brace', 'vent')`
		)
	]
);
