import { and, eq, sql } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { resourceStacks } from '../schema/resourceStacks.js';

export class InsufficientResourceError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'InsufficientResourceError';
	}
}

export type ConsumeResourceInput = {
	pilotId: string;
	resourceInstanceId: string;
	quantity: number;
	source: { type: string; id: string };
};

/**
 * Consume quantity inside an existing transaction — decrements stack and appends ledger row.
 */
export async function consumeResourceFromPilotTx(db: DbExecutor, input: ConsumeResourceInput) {
	if (input.quantity <= 0) {
		throw new Error('consume quantity must be positive');
	}

	const [stack] = await db
		.update(resourceStacks)
		.set({
			quantity: sql`${resourceStacks.quantity} - ${input.quantity}`
		})
		.where(
			and(
				eq(resourceStacks.pilotId, input.pilotId),
				eq(resourceStacks.resourceInstanceId, input.resourceInstanceId),
				sql`${resourceStacks.quantity} >= ${input.quantity}`
			)
		)
		.returning();

	if (!stack) {
		throw new InsufficientResourceError(
			`Insufficient quantity for resource instance ${input.resourceInstanceId}`
		);
	}

	await appendEconomyLedgerEntry(db, {
		eventType: 'resource_consumed',
		pilotId: input.pilotId,
		resourceInstanceId: input.resourceInstanceId,
		resourceStackId: stack.id,
		quantityDelta: -input.quantity,
		payload: {
			source_type: input.source.type,
			source_id: input.source.id
		}
	});

	return stack;
}
