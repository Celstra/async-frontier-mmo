import {
	bindOrderOnFirstSample,
	SETTLEMENT_MILESTONES,
	type ResourceFamily,
	type SettlementOrder,
	type SettlementOrderStatus
} from '@async-frontier-mmo/domain';
import { and, eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { consumeResourceFromPilotTx, InsufficientResourceError } from './resourceConsumes.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { getResourceInstanceById } from './resourceInstances.js';
import { settlementMilestones } from '../schema/settlementMilestones.js';
import { settlementOrders } from '../schema/settlementOrders.js';

function rowToOrder(row: typeof settlementOrders.$inferSelect): SettlementOrder {
	return {
		id: row.id,
		milestoneKey: row.milestoneKey,
		family: row.family as ResourceFamily,
		stackSize: row.stackSize,
		boundInstanceId: row.boundInstanceId,
		deliveredUnits: row.deliveredUnits,
		status: row.status as SettlementOrderStatus
	};
}

/** Seed milestone rows and open orders for the first-thump tutorial bootstrap. */
export async function ensureSettlementBootstrapForPilot(db: DbExecutor, pilotId: string) {
	for (const milestone of SETTLEMENT_MILESTONES) {
		await db
			.insert(settlementMilestones)
			.values({
				pilotId,
				milestoneKey: milestone.key,
				unlockedAt: null
			})
			.onConflictDoNothing();

		for (const order of milestone.orders) {
			await db
				.insert(settlementOrders)
				.values({
					pilotId,
					milestoneKey: milestone.key,
					family: order.family,
					stackSize: order.stackSize
				})
				.onConflictDoNothing({
					target: [
						settlementOrders.pilotId,
						settlementOrders.milestoneKey,
						settlementOrders.family
					]
				});
		}
	}
}

export async function listOpenSettlementOrdersForPilot(
	db: DbExecutor,
	pilotId: string
): Promise<SettlementOrder[]> {
	const rows = await db
		.select()
		.from(settlementOrders)
		.where(and(eq(settlementOrders.pilotId, pilotId), eq(settlementOrders.status, 'open')));

	return rows.map(rowToOrder);
}

export async function getSettlementOrderById(
	db: DbExecutor,
	input: { pilotId: string; orderId: string }
): Promise<SettlementOrder | null> {
	const [row] = await db
		.select()
		.from(settlementOrders)
		.where(and(eq(settlementOrders.id, input.orderId), eq(settlementOrders.pilotId, input.pilotId)))
		.limit(1);

	return row ? rowToOrder(row) : null;
}

/** Bind the first open family-matching order when a resource is sampled (Decision 022). */
export async function bindSettlementOrdersOnSample(
	db: DbExecutor,
	input: { pilotId: string; resourceInstanceId: string; family: ResourceFamily }
) {
	const openOrders = await listOpenSettlementOrdersForPilot(db, input.pilotId);

	for (const order of openOrders) {
		if (order.family !== input.family || order.boundInstanceId !== null) {
			continue;
		}

		const bound = bindOrderOnFirstSample(order, {
			instanceId: input.resourceInstanceId,
			family: input.family
		});

		await db
			.update(settlementOrders)
			.set({ boundInstanceId: bound.boundInstanceId })
			.where(eq(settlementOrders.id, order.id));
	}
}

export type DeliverStackToSettlementOrderOutcome =
	| { status: 'delivered'; deliveredUnits: number; orderFilled: boolean }
	| { status: 'order_not_found' }
	| { status: 'order_not_open' }
	| { status: 'wrong_family' }
	| { status: 'wrong_instance' }
	| { status: 'stack_empty' }
	| { status: 'over_delivery' };

/**
 * Turn in one resource stack toward an open order — consumes the full stack in one transaction.
 */
export async function deliverResourceStackToSettlementOrder(
	db: Db,
	input: { pilotId: string; orderId: string; resourceInstanceId: string }
): Promise<DeliverStackToSettlementOrderOutcome> {
	return db.transaction(async (tx) => {
		const [orderRow] = await tx
			.select()
			.from(settlementOrders)
			.where(
				and(eq(settlementOrders.id, input.orderId), eq(settlementOrders.pilotId, input.pilotId))
			)
			.limit(1);

		if (!orderRow) {
			return { status: 'order_not_found' as const };
		}

		if (orderRow.status !== 'open') {
			return { status: 'order_not_open' as const };
		}

		const resource = await getResourceInstanceById(tx, input.resourceInstanceId);
		if (!resource || resource.family !== orderRow.family) {
			return { status: 'wrong_family' as const };
		}

		if (orderRow.boundInstanceId && orderRow.boundInstanceId !== input.resourceInstanceId) {
			return { status: 'wrong_instance' as const };
		}

		const stack = await getResourceStackForPilotInstance(
			tx,
			input.pilotId,
			input.resourceInstanceId
		);
		if (!stack || stack.quantity <= 0) {
			return { status: 'stack_empty' as const };
		}

		const remaining = orderRow.stackSize - orderRow.deliveredUnits;
		if (stack.quantity > remaining) {
			return { status: 'over_delivery' as const };
		}

		try {
			await consumeResourceFromPilotTx(tx, {
				pilotId: input.pilotId,
				resourceInstanceId: input.resourceInstanceId,
				quantity: stack.quantity,
				source: { type: 'settlement_turn_in', id: orderRow.id }
			});
		} catch (error) {
			if (error instanceof InsufficientResourceError) {
				return { status: 'stack_empty' as const };
			}
			throw error;
		}

		const nextDelivered = orderRow.deliveredUnits + stack.quantity;
		const orderFilled = nextDelivered >= orderRow.stackSize;

		await tx
			.update(settlementOrders)
			.set({
				deliveredUnits: nextDelivered,
				status: orderFilled ? 'filled' : 'open',
				boundInstanceId: orderRow.boundInstanceId ?? input.resourceInstanceId
			})
			.where(eq(settlementOrders.id, orderRow.id));

		if (orderFilled) {
			const siblingOrders = await tx
				.select()
				.from(settlementOrders)
				.where(
					and(
						eq(settlementOrders.pilotId, input.pilotId),
						eq(settlementOrders.milestoneKey, orderRow.milestoneKey),
						eq(settlementOrders.status, 'open')
					)
				);

			if (siblingOrders.length === 0) {
				await tx
					.update(settlementMilestones)
					.set({ unlockedAt: new Date() })
					.where(
						and(
							eq(settlementMilestones.pilotId, input.pilotId),
							eq(settlementMilestones.milestoneKey, orderRow.milestoneKey)
						)
					);
			}
		}

		await appendEconomyLedgerEntry(tx, {
			eventType: 'settlement_turn_in',
			pilotId: input.pilotId,
			resourceInstanceId: input.resourceInstanceId,
			quantityDelta: -stack.quantity,
			payload: {
				order_id: orderRow.id,
				milestone_key: orderRow.milestoneKey,
				delivered_units: nextDelivered,
				stack_size: orderRow.stackSize,
				order_filled: orderFilled
			}
		});

		return {
			status: 'delivered' as const,
			deliveredUnits: nextDelivered,
			orderFilled
		};
	});
}

/** Test helper — remove settlement rows for a pilot. */
export async function clearPilotSettlementState(db: DbExecutor, pilotId: string) {
	await db.delete(settlementOrders).where(eq(settlementOrders.pilotId, pilotId));
	await db.delete(settlementMilestones).where(eq(settlementMilestones.pilotId, pilotId));
}
