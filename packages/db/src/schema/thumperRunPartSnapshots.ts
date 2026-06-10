import { index, integer, jsonb, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { items } from './items.js';
import { thumperRuns } from './thumperRuns.js';

/** Frozen thumper parts at deploy for audit replay (Decision 012). */
export const thumperRunPartSnapshots = pgTable(
	'thumper_run_part_snapshots',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		thumperRunId: uuid('thumper_run_id')
			.notNull()
			.references(() => thumperRuns.id, { onDelete: 'cascade' }),
		slot: text('slot').notNull(),
		itemId: uuid('item_id')
			.notNull()
			.references(() => items.id),
		schematicId: text('schematic_id').notNull(),
		displayName: text('display_name').notNull(),
		propertyScores: jsonb('property_scores').notNull().$type<Record<string, number>>(),
		conditionAtDeploy: integer('condition_at_deploy').notNull(),
		integrityAtDeploy: integer('integrity_at_deploy').notNull()
	},
	(table) => [
		uniqueIndex('thumper_run_part_snapshots_thumper_run_id_slot_key').on(
			table.thumperRunId,
			table.slot
		),
		index('thumper_run_part_snapshots_run_id_idx').on(table.thumperRunId)
	]
);
