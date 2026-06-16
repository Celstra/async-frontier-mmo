import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Append-only playtest telemetry — Decision 013 evidence, not economy truth. */
export const playtestEvents = pgTable(
	'playtest_events',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		eventName: text('event_name').notNull(),
		payload: jsonb('payload').notNull().default({}),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		index('playtest_events_pilot_id_idx').on(table.pilotId),
		index('playtest_events_pilot_event_idx').on(table.pilotId, table.eventName),
		index('playtest_events_created_at_idx').on(table.createdAt),
		uniqueIndex('playtest_events_supply_crate_available_crate_idx')
			.on(table.pilotId, sql`(payload->>'crateId')`)
			.where(
				sql`${table.eventName} = 'supply_crate_available' AND ${table.payload}->>'crateId' IS NOT NULL`
			)
	]
);
