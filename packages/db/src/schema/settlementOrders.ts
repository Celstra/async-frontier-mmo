import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';

/** Foreman turn-in order for one resource family (Decision 022 settlement slice). */
export const settlementOrders = pgTable(
	'settlement_orders',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		milestoneKey: text('milestone_key').notNull(),
		family: text('family').notNull(),
		stackSize: integer('stack_size').notNull(),
		boundInstanceId: uuid('bound_instance_id').references(() => resourceInstances.id),
		deliveredUnits: integer('delivered_units').notNull().default(0),
		status: text('status').notNull().default('open'),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('settlement_orders_pilot_milestone_family_idx').on(
			table.pilotId,
			table.milestoneKey,
			table.family
		)
	]
);
