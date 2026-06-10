import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { resourceInstances } from './resourceInstances.js';

/** World-state extraction ledger per deposit spot (Decision 019 — finite units). */
export const depositSpotYields = pgTable('deposit_spot_yields', {
	/** Domain spot id (e.g. veyrith_copper:spot:0). */
	spotId: text('spot_id').primaryKey(),
	resourceInstanceId: uuid('resource_instance_id')
		.notNull()
		.references(() => resourceInstances.id),
	unitsCapacity: integer('units_capacity').notNull(),
	unitsExtracted: integer('units_extracted').notNull().default(0),
	exhaustedAt: timestamp('exhausted_at', { withTimezone: true })
});
