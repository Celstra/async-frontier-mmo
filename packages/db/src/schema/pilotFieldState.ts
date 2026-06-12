import { integer, jsonb, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';

/** Per-pilot FIELD session: map position, scans, pending sample commitment. */
export const pilotFieldState = pgTable('pilot_field_state', {
	pilotId: text('pilot_id')
		.primaryKey()
		.references(() => pilots.id),
	selectedFamily: text('selected_family'),
	resourceInstanceId: uuid('resource_instance_id').references(() => resourceInstances.id),
	positionX: integer('position_x').notNull().default(8),
	positionY: integer('position_y').notNull().default(5),
	scannedTiles: jsonb('scanned_tiles').$type<string[]>().notNull().default([]),
	discoveredTiles: jsonb('discovered_tiles').$type<string[]>().notNull().default([]),
	pendingSampleSpotId: text('pending_sample_spot_id'),
	pendingSampleResourceInstanceId: uuid('pending_sample_resource_instance_id').references(
		() => resourceInstances.id
	),
	pendingSampleStartedAt: timestamp('pending_sample_started_at', { withTimezone: true }),
	pendingSampleCompletesAt: timestamp('pending_sample_completes_at', { withTimezone: true }),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
