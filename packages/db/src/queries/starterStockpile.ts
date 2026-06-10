import { and, eq, isNull } from 'drizzle-orm';
import { STARTER_STOCKPILE_GRANTS } from '@async-frontier-mmo/domain';
import type { Db, DbExecutor } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { pilots } from '../schema/pilots.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import { getPilotById } from './pilots.js';
import { getResourceInstanceByBloomSlug } from './resourceInstances.js';

const STARTER_STOCKPILE_SOURCE_TYPE = 'starter_stockpile';

export async function hasStarterStockpileGrant(db: DbExecutor, pilotId: string): Promise<boolean> {
	const pilot = await getPilotById(db, pilotId);
	if (pilot?.starterStockpileGrantedAt) {
		return true;
	}

	const entries = await db
		.select()
		.from(economyLedger)
		.where(
			and(eq(economyLedger.pilotId, pilotId), eq(economyLedger.eventType, 'resource_granted'))
		);

	return entries.some(
		(entry) =>
			entry.payload !== null &&
			typeof entry.payload === 'object' &&
			'source_type' in entry.payload &&
			entry.payload.source_type === STARTER_STOCKPILE_SOURCE_TYPE
	);
}

/**
 * Atomically claim the one-time starter grant flag, then grant resources + ledger rows.
 * Concurrent first requests: only one UPDATE … WHERE starter_stockpile_granted_at IS NULL wins.
 */
export async function ensureStarterStockpileForPilot(db: Db, pilotId: string) {
	if (await hasStarterStockpileGrant(db, pilotId)) {
		return { granted: false as const };
	}

	return db.transaction(async (tx) => {
		const [claimedPilot] = await tx
			.update(pilots)
			.set({ starterStockpileGrantedAt: new Date() })
			.where(and(eq(pilots.id, pilotId), isNull(pilots.starterStockpileGrantedAt)))
			.returning();

		if (!claimedPilot) {
			return { granted: false as const };
		}

		const grantBatchId = claimedPilot.id;

		for (const grant of STARTER_STOCKPILE_GRANTS) {
			const instance = await getResourceInstanceByBloomSlug(tx, BLOOM_ONE_ID, grant.resourceId);
			if (!instance) {
				throw new Error(`Starter stockpile resource missing: ${grant.resourceId}`);
			}

			await grantResourceToPilotTx(tx, {
				pilotId,
				resourceInstanceId: instance.id,
				quantity: grant.quantity,
				source: { type: STARTER_STOCKPILE_SOURCE_TYPE, id: grantBatchId }
			});
		}

		return { granted: true as const, grantBatchId };
	});
}
