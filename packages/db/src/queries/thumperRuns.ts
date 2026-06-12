import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export async function insertThumperRun(
	db: DbExecutor,
	input: {
		pilotId: string;
		targetResourceId: string;
		runSeed: string;
		isPushRun: boolean;
		deployedAt: Date;
		durationSeconds: number;
		depositSpotId?: string | null;
		trueConcentrationPercent?: number | null;
		extractionTailMinutes?: number;
		resourceInstanceId?: string | null;
	}
) {
	const [row] = await db
		.insert(thumperRuns)
		.values({
			pilotId: input.pilotId,
			targetResourceId: input.targetResourceId,
			runSeed: input.runSeed,
			isPushRun: input.isPushRun,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds,
			depositSpotId: input.depositSpotId ?? null,
			trueConcentrationPercent: input.trueConcentrationPercent ?? null,
			extractionTailMinutes: input.extractionTailMinutes ?? 60,
			resourceInstanceId: input.resourceInstanceId ?? null
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

export async function hasPilotCompletedTutorialThumper(
	db: DbExecutor,
	pilotId: string,
	tutorialRunSeed: string
) {
	const [row] = await db
		.select({ id: thumperRuns.id })
		.from(thumperRuns)
		.where(
			and(
				eq(thumperRuns.pilotId, pilotId),
				eq(thumperRuns.runSeed, tutorialRunSeed),
				isNotNull(thumperRuns.claimedAt)
			)
		)
		.limit(1);

	return row !== undefined;
}

export async function claimThumperRun(db: DbExecutor, id: string, claimedAt: Date) {
	const [row] = await db
		.update(thumperRuns)
		.set({ claimedAt })
		.where(and(eq(thumperRuns.id, id), isNull(thumperRuns.claimedAt)))
		.returning();

	return row ?? null;
}
