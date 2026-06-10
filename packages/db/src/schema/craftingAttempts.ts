import { boolean, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { items } from './items.js';
import { pilots } from './pilots.js';

/** Audit record for a craft commit — idempotent by pilot + idempotency key (Decision 012). */
export const craftingAttempts = pgTable(
	'crafting_attempts',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		idempotencyKey: text('idempotency_key').notNull(),
		schematicId: text('schematic_id').notNull(),
		schematicVersion: integer('schematic_version').notNull(),
		craftMode: text('craft_mode').notNull(),
		experimentSeed: text('experiment_seed'),
		tuning: jsonb('tuning').notNull().$type<Record<string, number>>(),
		slotSelections: jsonb('slot_selections').notNull().$type<CraftSlotSelection[]>(),
		preview: jsonb('preview').notNull(),
		resultExplanation: jsonb('result_explanation').notNull(),
		experimentOutcome: text('experiment_outcome'),
		hasMinorFlaw: boolean('has_minor_flaw').notNull().default(false),
		itemId: uuid('item_id').references(() => items.id),
		status: text('status').notNull(),
		failureReason: text('failure_reason'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('crafting_attempts_pilot_idempotency_idx').on(
			table.pilotId,
			table.idempotencyKey
		)
	]
);

export type CraftSlotSelection = {
	slotId: string;
	resourceInstanceId: string;
	quantity: number;
};
