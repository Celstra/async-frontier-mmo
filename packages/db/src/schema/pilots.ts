import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pilots = pgTable('pilots', {
	id: text('id').primaryKey(),
	frameId: text('frame_id').notNull().default('recon'),
	/** Set atomically when Decision 011 starter stockpile is granted — once per pilot. */
	starterStockpileGrantedAt: timestamp('starter_stockpile_granted_at', { withTimezone: true }),
	/** MVP: one equipped Survey Scanner Module Mk I per pilot (Lesson 5.3). FK in migration SQL. */
	equippedScannerItemId: uuid('equipped_scanner_item_id')
});
