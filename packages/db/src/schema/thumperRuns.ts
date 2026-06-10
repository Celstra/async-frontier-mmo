import { isNull } from 'drizzle-orm';
import { boolean, index, integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const thumperRuns = pgTable(
	'thumper_runs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id').notNull(),
		/** Frame snapshotted at deploy — part of run config for audit replay. */
		pilotFrameId: text('pilot_frame_id').notNull().default('recon'),
		targetResourceId: text('target_resource_id').notNull(),
		/** Stored at deploy — window order/complications replay from this seed. */
		runSeed: text('run_seed').notNull().default('legacy'),
		/** Push runs allow a third event window and higher projected recovery. */
		isPushRun: boolean('is_push_run').notNull().default(false),
		deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		/** Run hull durability until thumper parts are equippable items (Lesson 6.3). */
		runHullCondition: integer('run_hull_condition').notNull().default(100),
		runHullIntegrity: integer('run_hull_integrity').notNull().default(100),
		claimedAt: timestamp('claimed_at', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('thumper_runs_one_open_per_pilot')
			.on(table.pilotId)
			.where(isNull(table.claimedAt)),
		index('thumper_runs_pilot_id_deployed_at_idx').on(table.pilotId, table.deployedAt)
	]
);
