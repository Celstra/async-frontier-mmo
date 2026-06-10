import { integer, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

/** One named resource spawn in a bloom — stats frozen at insert (Decision 012). */
export const resourceInstances = pgTable(
	'resource_instances',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		/** Stable slug (e.g. veyrith_copper) — unique within a bloom. */
		resourceSlug: text('resource_slug').notNull(),
		/** Player-facing unique name for this spawn (locked on seed bloom #1). */
		displayName: text('display_name').notNull(),
		family: text('family').notNull(),
		statOq: integer('stat_oq').notNull(),
		statConductivity: integer('stat_conductivity').notNull(),
		statHardness: integer('stat_hardness').notNull(),
		statHeatResistance: integer('stat_heat_resistance').notNull(),
		statMalleability: integer('stat_malleability').notNull(),
		bloomId: integer('bloom_id').notNull(),
		/** Rolled concentration ceiling range for this spawn (Decision 020/021). */
		concentrationMinPercent: integer('concentration_min_percent').notNull(),
		concentrationMaxPercent: integer('concentration_max_percent').notNull(),
		/** Hidden lifespan rolled at spawn (Decision 020). */
		lifespanDays: integer('lifespan_days').notNull(),
		spawnedAt: timestamp('spawned_at', { withTimezone: true }).notNull(),
		extinctAt: timestamp('extinct_at', { withTimezone: true })
	},
	(table) => [
		uniqueIndex('resource_instances_display_name_idx').on(table.displayName),
		uniqueIndex('resource_instances_bloom_slug_idx').on(table.bloomId, table.resourceSlug)
	]
);
