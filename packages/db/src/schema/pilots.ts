import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const pilots = pgTable('pilots', {
	id: text('id').primaryKey(),
	frameId: text('frame_id').notNull().default('recon'),
	/** Set atomically when Decision 011 starter stockpile is granted — once per pilot. */
	starterStockpileGrantedAt: timestamp('starter_stockpile_granted_at', { withTimezone: true })
});
