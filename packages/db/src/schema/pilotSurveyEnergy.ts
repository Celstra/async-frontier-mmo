import { integer, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Regenerating survey-energy pool per pilot (Decision 019). */
export const pilotSurveyEnergy = pgTable('pilot_survey_energy', {
	pilotId: text('pilot_id')
		.primaryKey()
		.references(() => pilots.id),
	/** Stored value before regen — resolve with domain {@link resolveSurveyEnergy} on read. */
	surveyEnergy: integer('survey_energy').notNull(),
	lastUpdatedAt: timestamp('last_updated_at', { withTimezone: true }).notNull()
});
