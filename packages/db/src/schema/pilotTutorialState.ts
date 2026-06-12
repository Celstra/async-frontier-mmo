import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Tutorial step progression — wired in Phase 7; persisted from Phase 2. */
export const pilotTutorialState = pgTable('pilot_tutorial_state', {
	pilotId: text('pilot_id')
		.primaryKey()
		.references(() => pilots.id),
	step: text('step').notNull(),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
