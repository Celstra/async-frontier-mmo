import { eq } from 'drizzle-orm';
import type { FrameId } from 'shared';
import { DEMO_PILOT_ID, parseFrameId } from 'shared';
import type { Db, DbExecutor } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { ensureBloomOneResourceInstances } from './resourceInstances.js';
import { ensureStarterStockpileForPilot } from './starterStockpile.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';

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

export function pilotNeedsFrameChoice(
	pilot: { starterStockpileGrantedAt?: Date | null } | null | undefined
): boolean {
	return !pilot || pilot.starterStockpileGrantedAt == null;
}

/** Create a session pilot row without granting the Decision 011 starter kit. */
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

/** Persist frame choice and grant the one-time starter kit (Decision 011). */
export async function setPilotFrame(db: Db, pilotId: string, frameId: FrameId) {
	parseFrameId(frameId);
	await ensureSessionPilot(db, pilotId);

	await db.update(pilots).set({ frameId }).where(eq(pilots.id, pilotId));

	await ensureBloomOneResourceInstances(db);
	await ensureStarterStockpileForPilot(db, pilotId);
	await ensureStarterThumperPartsForPilot(db, pilotId);

	return { frameId };
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

/** Bloom resources + starter kit for a pilot that already chose a frame. */
export async function ensurePilotGameReady(db: Db, pilotId: string) {
	await ensureSessionPilot(db, pilotId);
	await ensureBloomOneResourceInstances(db);
	await ensureStarterStockpileForPilot(db, pilotId);
	await ensureStarterThumperPartsForPilot(db, pilotId);
}

/** Demo pilot + bloom resources + Decision 011 starter stockpile. */
export async function ensureDemoPilotReady(db: Db) {
	await ensureDemoPilot(db);
	await ensurePilotGameReady(db, DEMO_PILOT_ID);
}
