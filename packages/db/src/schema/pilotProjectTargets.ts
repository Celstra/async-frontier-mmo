import { integer, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { pilots } from './pilots.js';
import { resourceInstances } from './resourceInstances.js';
import { resourceStacks } from './resourceStacks.js';
import { thumperRunResults } from './thumperRunResults.js';

/** Decision 025 — durable project chase context across WORKSHOP ↔ FIELD. */
export const pilotProjectTargets = pgTable('pilot_project_targets', {
	pilotId: text('pilot_id')
		.primaryKey()
		.references(() => pilots.id),
	schematicId: text('schematic_id').notNull(),
	targetSlotId: text('target_slot_id').notNull(),
	targetFamily: text('target_family').notNull(),
	targetResourceInstanceId: uuid('target_resource_instance_id').references(() => resourceInstances.id),
	sampledSpotId: text('sampled_spot_id'),
	materialSecuredAt: timestamp('material_secured_at', { withTimezone: true }),
	/** Decision 025 — claim-time evidence written exactly once when material is secured. */
	securedClaimResultId: uuid('secured_claim_result_id').references(() => thumperRunResults.id),
	securedResourceStackId: uuid('secured_resource_stack_id').references(() => resourceStacks.id),
	securedQuantity: integer('secured_quantity'),
	securedProjectNeedUnits: integer('secured_project_need_units'),
	securedSpotRemainingUnits: integer('secured_spot_remaining_units'),
	updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
});
