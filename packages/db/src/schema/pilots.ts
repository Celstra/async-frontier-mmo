import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const pilots = pgTable('pilots', {
	id: text('id').primaryKey(),
	frameId: text('frame_id').notNull().default('recon'),
	/** Set atomically when Decision 011 starter stockpile is granted — once per pilot. */
	starterStockpileGrantedAt: timestamp('starter_stockpile_granted_at', { withTimezone: true }),
	/** MVP: one equipped Survey Scanner Module Mk I per pilot (Lesson 5.3). FK in migration SQL. */
	equippedScannerItemId: uuid('equipped_scanner_item_id'),
	equippedDrillItemId: uuid('equipped_drill_item_id'),
	equippedPumpItemId: uuid('equipped_pump_item_id'),
	equippedHullItemId: uuid('equipped_hull_item_id'),
	starterThumperPartsGrantedAt: timestamp('starter_thumper_parts_granted_at', {
		withTimezone: true
	})
});
