import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Regenerating survey-energy pool per pilot (Decision 019). */
export const pilotSurveyEnergy = pgTable('pilot_survey_energy', {
	pilotId: text('pilot_id')
		.primaryKey()
		.references(() => pilots.id),
	/** Stored raw energy before trickle accrual — resolve with domain {@link accrueEnergy} on read. */
	rawEnergy: integer('raw_energy').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull()
});
