import { integer, pgTable, text, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';

/** Pilot-owned quantity of one resource instance (Decision 012). */
export const resourceStacks = pgTable(
	'resource_stacks',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		resourceInstanceId: uuid('resource_instance_id')
			.notNull()
			.references(() => resourceInstances.id),
		quantity: integer('quantity').notNull()
	},
	(table) => [
		uniqueIndex('resource_stacks_pilot_instance_idx').on(
			table.pilotId,
			table.resourceInstanceId
		)
	]
);
