import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

export const pilotWorkshopState = pgTable('pilot_workshop_state', {
	pilotId: text('pilot_id')
		.primaryKey()
		.references(() => pilots.id),
	starterGrantedAt: timestamp('starter_granted_at', { withTimezone: true }),
	craftCountSinceCrate: integer('craft_count_since_crate').notNull().default(0),
	nextTimedCrateAt: timestamp('next_timed_crate_at', { withTimezone: true }),
	crateSequence: integer('crate_sequence').notNull().default(0),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
