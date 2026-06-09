import { integer, pgTable, timestamp, uuid } from 'drizzle-orm/pg-core';

export const thumperEvents = pgTable('thumper_events', {
	id: uuid('id').primaryKey().defaultRandom(),
	deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull(),
	durationSeconds: integer('duration_seconds').notNull(),
	claimedAt: timestamp('claimed_at', { withTimezone: true })
});
