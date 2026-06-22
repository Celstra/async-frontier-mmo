import { isNull } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const thumperRuns = pgTable(
	'thumper_runs',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id').notNull(),
		targetResourceId: text('target_resource_id').notNull(),
		/** Sampled deposit spot from Decision 019 prospecting. */
		depositSpotId: text('deposit_spot_id'),
		/** Spot concentration at deploy — extraction multiplier input. */
		trueConcentrationPercent: integer('true_concentration_percent'),
		/** Passive extraction tail length (Decision 017). */
		extractionTailMinutes: integer('extraction_tail_minutes').notNull().default(60),
		resourceInstanceId: uuid('resource_instance_id'),
		/** Stored at deploy — window order/complications replay from this seed. */
		runSeed: text('run_seed').notNull().default('legacy'),
		/** Push runs allow a third event window and higher projected recovery. */
		isPushRun: boolean('is_push_run').notNull().default(false),
		deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull(),
		durationSeconds: integer('duration_seconds').notNull(),
		/** Run hull durability until thumper parts are equippable items (Lesson 6.3). */
		runHullCondition: integer('run_hull_condition').notNull().default(100),
		runHullIntegrity: integer('run_hull_integrity').notNull().default(100),
		claimedAt: timestamp('claimed_at', { withTimezone: true }),
		/** Set when claim-time part wear is applied exactly once. */
		partWearAppliedAt: timestamp('part_wear_applied_at', { withTimezone: true }),
		/** Decision 025 — frozen project-led context at deploy (not inferred from pilot targets at claim). */
		runMode: text('run_mode'),
		projectSchematicId: text('project_schematic_id'),
		projectTargetSlotId: text('project_target_slot_id'),
		projectTargetFamily: text('project_target_family'),
		projectNeedUnits: integer('project_need_units'),
		/** Decision 025 — authoritative defense encounter action log for claim replay. */
		defenseActionLog: jsonb('defense_action_log').notNull().default([])
	},
	(table) => [
		uniqueIndex('thumper_runs_one_open_per_pilot')
			.on(table.pilotId)
			.where(isNull(table.claimedAt)),
		index('thumper_runs_pilot_id_deployed_at_idx').on(table.pilotId, table.deployedAt)
	]
);
