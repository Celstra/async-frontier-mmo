import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';
import { resourceStacks } from './resourceStacks.js';

/** Append-only audit trail for economy mutations (Decision 012). */
export const economyLedger = pgTable('economy_ledger', {
	id: uuid('id').primaryKey().defaultRandom(),
	eventType: text('event_type').notNull(),
	pilotId: text('pilot_id').references(() => pilots.id),
	resourceInstanceId: uuid('resource_instance_id').references(() => resourceInstances.id),
	resourceStackId: uuid('resource_stack_id').references(() => resourceStacks.id),
	quantityDelta: integer('quantity_delta'),
	payload: jsonb('payload').notNull().default({}),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});
