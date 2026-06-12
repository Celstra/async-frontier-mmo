import { eq } from 'drizzle-orm';
import { DEMO_PILOT_ID } from 'shared';
import type { Db, DbExecutor } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { ensureBloomOneResourceInstances } from './resourceInstances.js';
import { ensureSettlementBootstrapForPilot } from './settlement.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';

export async function getPilotById(db: DbExecutor, pilotId: string) {
	const [pilot] = await db.select().from(pilots).where(eq(pilots.id, pilotId)).limit(1);
	return pilot ?? null;
}

/** Create a session pilot row without granting tutorial bootstrap rewards. */
export async function ensureSessionPilot(db: DbExecutor, pilotId: string) {
	const existing = await getPilotById(db, pilotId);
	if (existing) {
		return existing;
	}

	const [created] = await db.insert(pilots).values({ id: pilotId }).onConflictDoNothing().returning();

	if (created) {
		return created;
	}

	return (await getPilotById(db, pilotId))!;
}

/** Bloom resources, settlement orders, and scavenged thumper parts for a playable pilot. */
export async function ensurePilotGameReady(db: Db, pilotId: string) {
	await ensureSessionPilot(db, pilotId);
	await ensureBloomOneResourceInstances(db);
	await ensureSettlementBootstrapForPilot(db, pilotId);
	await ensureStarterThumperPartsForPilot(db, pilotId);
}

/** Idempotent seed for the learning scaffold demo pilot. */
export async function ensureDemoPilot(db: DbExecutor) {
	const existing = await getPilotById(db, DEMO_PILOT_ID);
	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(pilots)
		.values({ id: DEMO_PILOT_ID })
		.onConflictDoNothing()
		.returning();

	if (created) {
		return created;
	}

	return (await getPilotById(db, DEMO_PILOT_ID))!;
}

/** Demo pilot + bloom resources + settlement bootstrap. */
export async function ensureDemoPilotReady(db: Db) {
	await ensureDemoPilot(db);
	await ensurePilotGameReady(db, DEMO_PILOT_ID);
}
