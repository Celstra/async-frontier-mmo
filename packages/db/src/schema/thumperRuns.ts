import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const thumperRuns = pgTable('thumper_runs', {
	id: uuid('id').primaryKey().defaultRandom(),
	pilotId: text('pilot_id').notNull(),
	/** Frame snapshotted at deploy — part of run config for audit replay. */
	pilotFrameId: text('pilot_frame_id').notNull().default('recon'),
	targetResourceId: text('target_resource_id').notNull(),
	deployedAt: timestamp('deployed_at', { withTimezone: true }).notNull(),
	durationSeconds: integer('duration_seconds').notNull(),
	claimedAt: timestamp('claimed_at', { withTimezone: true })
});
