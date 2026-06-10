import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { thumperRuns } from './thumperRuns.js';

export const thumperRunResults = pgTable('thumper_run_results', {
	id: uuid('id').primaryKey().defaultRandom(),
	thumperRunId: uuid('thumper_run_id')
		.notNull()
		.unique()
		.references(() => thumperRuns.id),
	targetResourceId: text('target_resource_id').notNull(),
	projectedRecovery: integer('projected_recovery').notNull(),
	recoveredQuantity: integer('recovered_quantity').notNull(),
	wasteQuantity: integer('waste_quantity').notNull(),
	forfeitedRecovery: integer('forfeited_recovery').notNull().default(0),
	resolutionType: text('resolution_type').notNull().default('completed'),
	appliedWear: integer('applied_wear').notNull().default(0),
	explanation: text('explanation').notNull(),
	resolvedAt: timestamp('resolved_at', { withTimezone: true }).notNull()
});
