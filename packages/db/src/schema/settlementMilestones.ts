import { pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';

/** Per-pilot settlement milestone unlock timestamps. */
export const settlementMilestones = pgTable(
	'settlement_milestones',
	{
		pilotId: text('pilot_id')
			.notNull()
			.references(() => pilots.id),
		milestoneKey: text('milestone_key').notNull(),
		unlockedAt: timestamp('unlocked_at', { withTimezone: true })
	},
	(table) => [primaryKey({ columns: [table.pilotId, table.milestoneKey] })]
);
