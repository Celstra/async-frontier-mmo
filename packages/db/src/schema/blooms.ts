import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

/** Bloom generation metadata — bloom #1 is locked; rotations append new rows. */
export const blooms = pgTable('blooms', {
	id: integer('id').primaryKey(),
	generationSeed: text('generation_seed').notNull(),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
	rotatedAt: timestamp('rotated_at', { withTimezone: true })
});
