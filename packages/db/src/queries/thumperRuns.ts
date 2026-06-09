import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db } from '../client.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export async function insertThumperRun(
	db: Db,
	input: {
		pilotId: string;
		targetResourceId: string;
		deployedAt: Date;
		durationSeconds: number;
	}
) {
	const [row] = await db
		.insert(thumperRuns)
		.values({
			pilotId: input.pilotId,
			targetResourceId: input.targetResourceId,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds
		})
		.returning();

	return row;
}

export async function getLatestThumperRunForPilot(db: Db, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, pilotId))
		.orderBy(desc(thumperRuns.deployedAt))
		.limit(1);

	return row ?? null;
}

export async function getOpenThumperRunForPilot(db: Db, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperRuns)
		.where(and(eq(thumperRuns.pilotId, pilotId), isNull(thumperRuns.claimedAt)))
		.limit(1);

	return row ?? null;
}

export async function claimThumperRun(db: Db, id: string) {
	const [row] = await db
		.update(thumperRuns)
		.set({ claimedAt: new Date() })
		.where(and(eq(thumperRuns.id, id), isNull(thumperRuns.claimedAt)))
		.returning();

	return row ?? null;
}
