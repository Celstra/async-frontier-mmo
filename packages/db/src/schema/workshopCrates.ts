import { index, integer, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

export type WorkshopSupplyCrateReason = 'timer' | 'craft_count' | 'emergency' | 'starter';

export type WorkshopSupplyCrateStatus = 'available' | 'opened' | 'expired';

export type WorkshopCratePayloadLine = {
	resourceSlug: string;
	resourceInstanceId: string;
	quantity: number;
};

export const workshopCrates = pgTable(
	'workshop_crates',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		sequence: integer('sequence').notNull(),
		reason: text('reason').notNull().$type<WorkshopSupplyCrateReason>(),
		status: text('status').notNull().$type<WorkshopSupplyCrateStatus>().default('available'),
		availableAt: timestamp('available_at', { withTimezone: true }).notNull().defaultNow(),
		openedAt: timestamp('opened_at', { withTimezone: true }),
		payload: jsonb('payload').notNull().$type<WorkshopCratePayloadLine[]>()
	},
	(table) => [
		uniqueIndex('workshop_crates_pilot_sequence_idx').on(table.pilotId, table.sequence),
		index('workshop_crates_pilot_status_idx').on(table.pilotId, table.status)
	]
);
