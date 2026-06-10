import { and, eq, sql } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { resourceStacks } from '../schema/resourceStacks.js';

export async function getResourceStackForPilotInstance(
	db: DbExecutor,
	pilotId: string,
	resourceInstanceId: string
) {
	const [stack] = await db
		.select()
		.from(resourceStacks)
		.where(
			and(
				eq(resourceStacks.pilotId, pilotId),
				eq(resourceStacks.resourceInstanceId, resourceInstanceId)
			)
		)
		.limit(1);

	return stack ?? null;
}

export async function listResourceStacksForPilot(db: DbExecutor, pilotId: string) {
	return db.select().from(resourceStacks).where(eq(resourceStacks.pilotId, pilotId));
}

/**
 * Grant quantity to a pilot — combines stacks by pilot + instance (Decision 012)
 * and appends a resource_granted ledger row in the same transaction.
 */
export async function grantResourceToPilot(
	db: Db,
	input: {
		pilotId: string;
		resourceInstanceId: string;
		quantity: number;
		source: { type: string; id: string };
	}
) {
	if (input.quantity <= 0) {
		throw new Error('grant quantity must be positive');
	}

	return db.transaction(async (tx: DbExecutor) => {
		const [stack] = await tx
			.insert(resourceStacks)
			.values({
				pilotId: input.pilotId,
				resourceInstanceId: input.resourceInstanceId,
				quantity: input.quantity
			})
			.onConflictDoUpdate({
				target: [resourceStacks.pilotId, resourceStacks.resourceInstanceId],
				set: {
					quantity: sql`${resourceStacks.quantity} + ${input.quantity}`
				}
			})
			.returning();

		await appendEconomyLedgerEntry(tx, {
			eventType: 'resource_granted',
			pilotId: input.pilotId,
			resourceInstanceId: input.resourceInstanceId,
			resourceStackId: stack!.id,
			quantityDelta: input.quantity,
			payload: {
				source_type: input.source.type,
				source_id: input.source.id
			}
		});

		return stack!;
	});
}
