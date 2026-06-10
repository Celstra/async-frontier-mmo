import { and, desc, eq, isNull } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export async function insertThumperRun(
	db: DbExecutor,
	input: {
		pilotId: string;
		pilotFrameId: string;
		targetResourceId: string;
		deployedAt: Date;
		durationSeconds: number;
	}
) {
	const [row] = await db
		.insert(thumperRuns)
		.values({
			pilotId: input.pilotId,
			pilotFrameId: input.pilotFrameId,
			targetResourceId: input.targetResourceId,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds
		})
		.returning();

	return row;
}

export async function getLatestThumperRunForPilot(db: DbExecutor, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, pilotId))
		.orderBy(desc(thumperRuns.deployedAt))
		.limit(1);

	return row ?? null;
}

export async function getOpenThumperRunForPilot(db: DbExecutor, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperRuns)
		.where(and(eq(thumperRuns.pilotId, pilotId), isNull(thumperRuns.claimedAt)))
		.limit(1);

	return row ?? null;
}

export async function claimThumperRun(db: DbExecutor, id: string) {
	const [row] = await db
		.update(thumperRuns)
		.set({ claimedAt: new Date() })
		.where(and(eq(thumperRuns.id, id), isNull(thumperRuns.claimedAt)))
		.returning();

	return row ?? null;
}
