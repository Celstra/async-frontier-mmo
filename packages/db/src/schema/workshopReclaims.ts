import { index, jsonb, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { items } from './items.js';
import { pilots } from './pilots.js';

export type WorkshopReclaimReturnedResource = {
	resourceSlug: string;
	resourceInstanceId: string;
	quantity: number;
};

export const workshopReclaims = pgTable(
	'workshop_reclaims',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		itemId: uuid('item_id')
			.notNull()
			.references(() => items.id),
		idempotencyKey: text('idempotency_key').notNull(),
		returnedResources: jsonb('returned_resources')
			.notNull()
			.$type<WorkshopReclaimReturnedResource[]>(),
		createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('workshop_reclaims_pilot_idempotency_idx').on(table.pilotId, table.idempotencyKey),
		index('workshop_reclaims_pilot_item_idx').on(table.pilotId, table.itemId)
	]
);
