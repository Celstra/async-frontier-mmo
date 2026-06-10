import { boolean, integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Crafted/equipped object with property scores and slot provenance (Decision 012). */
export const items = pgTable('items', {
	id: uuid('id').primaryKey().defaultRandom(),
	pilotId: text('pilot_id')
		.notNull()
		.references(() => pilots.id),
	schematicId: text('schematic_id').notNull(),
	schematicVersion: integer('schematic_version').notNull(),
	displayName: text('display_name').notNull(),
	propertyScores: jsonb('property_scores').notNull().$type<Record<string, number>>(),
	provenance: jsonb('provenance').notNull().$type<CraftSlotProvenance[]>(),
	hasMinorFlaw: boolean('has_minor_flaw').notNull().default(false),
	condition: integer('condition').notNull().default(100),
	integrity: integer('integrity').notNull().default(100),
	createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
});

export type CraftSlotProvenance = {
	slotId: string;
	slotDisplayName: string;
	resourceInstanceId: string;
	resourceSlug: string;
	resourceDisplayName: string;
	family: string;
	quantityConsumed: number;
};
