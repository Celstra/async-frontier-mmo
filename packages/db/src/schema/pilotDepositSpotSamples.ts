import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';

/** Persisted sample state per pilot + deposit spot (Decision 019). */
export const pilotDepositSpotSamples = pgTable(
	'pilot_deposit_spot_samples',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		resourceInstanceId: uuid('resource_instance_id')
			.notNull()
			.references(() => resourceInstances.id),
		/** Domain spot id (e.g. veyrith_copper:spot:0) — unique per pilot. */
		spotId: text('spot_id').notNull(),
		trueConcentrationPercent: integer('true_concentration_percent').notNull(),
		/** Hand-samples taken on this spot toward {@link SPOT_SAMPLE_POOL} (Decision 022). */
		samplesTaken: integer('samples_taken').notNull().default(1),
		sampledAt: timestamp('sampled_at', { withTimezone: true }).notNull().defaultNow()
	},
	(table) => [
		uniqueIndex('pilot_deposit_spot_samples_pilot_spot_idx').on(table.pilotId, table.spotId)
	]
);
