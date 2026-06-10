import { asc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import type { EconomyLedgerEventType } from '../economy/eventTypes.js';
import { economyLedger } from '../schema/economyLedger.js';

const ledgerChronologicalOrder = [
	asc(economyLedger.createdAt),
	asc(economyLedger.id)
] as const;

/** Internal append — prefer domain-specific grant/consume helpers that enforce FK validity. */
export async function appendEconomyLedgerEntry(
	db: DbExecutor,
	input: {
		eventType: EconomyLedgerEventType;
		pilotId?: string;
		resourceInstanceId?: string;
		resourceStackId?: string;
		quantityDelta?: number;
		payload?: Record<string, unknown>;
		createdAt?: Date;
	}
) {
	const [entry] = await db
		.insert(economyLedger)
		.values({
			eventType: input.eventType,
			pilotId: input.pilotId,
			resourceInstanceId: input.resourceInstanceId,
			resourceStackId: input.resourceStackId,
			quantityDelta: input.quantityDelta,
			payload: input.payload ?? {},
			createdAt: input.createdAt
		})
		.returning();

	return entry!;
}

export async function listEconomyLedgerEntriesForPilot(db: DbExecutor, pilotId: string) {
	return db
		.select()
		.from(economyLedger)
		.where(eq(economyLedger.pilotId, pilotId))
		.orderBy(...ledgerChronologicalOrder);
}

export async function listEconomyLedgerEntriesForStack(db: DbExecutor, resourceStackId: string) {
	return db
		.select()
		.from(economyLedger)
		.where(eq(economyLedger.resourceStackId, resourceStackId))
		.orderBy(...ledgerChronologicalOrder);
}
