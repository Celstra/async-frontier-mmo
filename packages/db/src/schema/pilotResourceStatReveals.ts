import { pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';

/** First-sample stat reveal per pilot + resource instance (Decision 019). */
export const pilotResourceStatReveals = pgTable(
	'pilot_resource_stat_reveals',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		resourceInstanceId: uuid('resource_instance_id')
			.notNull()
			.references(() => resourceInstances.id),
		revealedAt: timestamp('revealed_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('pilot_resource_stat_reveals_pilot_instance_idx').on(
			table.pilotId,
			table.resourceInstanceId
		)
	]
);
