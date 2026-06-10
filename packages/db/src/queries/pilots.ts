import { eq } from 'drizzle-orm';
import type { FrameId } from 'shared';
import { DEMO_PILOT_ID, parseFrameId } from 'shared';
import type { Db, DbExecutor } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { ensureBloomOneResourceInstances } from './resourceInstances.js';
import { ensureStarterStockpileForPilot } from './starterStockpile.js';

export async function getPilotById(db: DbExecutor, pilotId: string) {
	const [pilot] = await db.select().from(pilots).where(eq(pilots.id, pilotId)).limit(1);
	return pilot ?? null;
}

export async function getPilotFrame(db: DbExecutor, pilotId: string): Promise<FrameId> {
	const pilot = await getPilotById(db, pilotId);
	if (!pilot) {
		throw new Error(`Pilot not found: ${pilotId}`);
	}

	return parseFrameId(pilot.frameId);
}

/** Idempotent seed for the learning scaffold demo pilot. */
export async function ensureDemoPilot(db: DbExecutor) {
	const existing = await getPilotById(db, DEMO_PILOT_ID);
	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(pilots)
		.values({ id: DEMO_PILOT_ID, frameId: 'recon' })
		.onConflictDoNothing()
		.returning();

	if (created) {
		return created;
	}

	return (await getPilotById(db, DEMO_PILOT_ID))!;
}

/** Demo pilot + bloom resources + Decision 011 starter stockpile. */
export async function ensureDemoPilotReady(db: Db) {
	await ensureDemoPilot(db);
	await ensureBloomOneResourceInstances(db);
	await ensureStarterStockpileForPilot(db, DEMO_PILOT_ID);
}
