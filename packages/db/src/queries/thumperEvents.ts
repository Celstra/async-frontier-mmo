import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../client.js';
import { thumperEvents } from '../schema/thumperEvents.js';

export async function insertThumperEvent(
	db: Db,
	input: { pilotId: string; deployedAt: Date; durationSeconds: number }
) {
	const [row] = await db
		.insert(thumperEvents)
		.values({
			pilotId: input.pilotId,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds
		})
		.returning();

	return row;
}

export async function getLatestThumperForPilot(db: Db, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperEvents)
		.where(eq(thumperEvents.pilotId, pilotId))
		.orderBy(desc(thumperEvents.deployedAt))
		.limit(1);

	return row ?? null;
}

export async function getOpenThumperForPilot(db: Db, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperEvents)
		.where(and(eq(thumperEvents.pilotId, pilotId), isNull(thumperEvents.claimedAt)))
		.limit(1);

	return row ?? null;
}

export async function claimThumperEvent(db: Db, id: string) {
	const [row] = await db
		.update(thumperEvents)
		.set({ claimedAt: new Date() })
		.where(and(eq(thumperEvents.id, id), isNull(thumperEvents.claimedAt)))
		.returning();

	return row ?? null;
}
