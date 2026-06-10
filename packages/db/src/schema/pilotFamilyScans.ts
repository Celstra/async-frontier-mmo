import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Paid family scan for active bloom — gates read-only survey preview (Decision 019). */
export const pilotFamilyScans = pgTable(
	'pilot_family_scans',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		bloomId: integer('bloom_id').notNull(),
		family: text('family').notNull(),
		scannedAt: timestamp('scanned_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('pilot_family_scans_pilot_bloom_family_idx').on(
			table.pilotId,
			table.bloomId,
			table.family
		)
	]
);
