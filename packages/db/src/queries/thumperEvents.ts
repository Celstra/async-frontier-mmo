import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../client.js';
import { thumperEvents } from '../schema/thumperEvents.js';

export async function insertThumperEvent(
	db: Db,
	input: { deployedAt: Date; durationSeconds: number }
) {
	const [row] = await db
		.insert(thumperEvents)
		.values({
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds
		})
		.returning();

	return row;
}

export async function getLatestThumperEvent(db: Db) {
	const [row] = await db
		.select()
		.from(thumperEvents)
		.orderBy(desc(thumperEvents.deployedAt))
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
