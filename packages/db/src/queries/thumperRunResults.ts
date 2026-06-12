import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export async function insertThumperRunResult(
	db: DbExecutor,
	input: {
		thumperRunId: string;
		targetResourceId: string;
		projectedRecovery: number;
		recoveredQuantity: number;
		wasteQuantity: number;
		forfeitedRecovery: number;
		resolutionType: string;
		recallReason?: string | null;
		appliedWear: number;
		explanation: string;
		resolvedAt: Date;
	}
) {
	const [row] = await db
		.insert(thumperRunResults)
		.values({
			thumperRunId: input.thumperRunId,
			targetResourceId: input.targetResourceId,
			projectedRecovery: input.projectedRecovery,
			recoveredQuantity: input.recoveredQuantity,
			wasteQuantity: input.wasteQuantity,
			forfeitedRecovery: input.forfeitedRecovery,
			resolutionType: input.resolutionType,
			recallReason: input.recallReason ?? null,
			appliedWear: input.appliedWear,
			explanation: input.explanation,
			resolvedAt: input.resolvedAt
		})
		.returning();

	return row;
}

export async function getThumperRunResultForRun(db: DbExecutor, thumperRunId: string) {
	const [row] = await db
		.select()
		.from(thumperRunResults)
		.where(eq(thumperRunResults.thumperRunId, thumperRunId))
		.limit(1);

	return row ?? null;
}

export async function acknowledgeThumperRunResult(
	db: DbExecutor,
	input: { pilotId: string; thumperRunId: string; acknowledgedAt?: Date }
): Promise<{ status: 'acknowledged' } | { status: 'not_found' } | { status: 'already_acknowledged' }> {
	const acknowledgedAt = input.acknowledgedAt ?? new Date();

	const [row] = await db
		.select({ resultId: thumperRunResults.id, acknowledgedAt: thumperRunResults.acknowledgedAt })
		.from(thumperRunResults)
		.innerJoin(thumperRuns, eq(thumperRunResults.thumperRunId, thumperRuns.id))
		.where(
			and(eq(thumperRuns.id, input.thumperRunId), eq(thumperRuns.pilotId, input.pilotId))
		)
		.limit(1);

	if (!row) {
		return { status: 'not_found' };
	}

	if (row.acknowledgedAt) {
		return { status: 'already_acknowledged' };
	}

	await db
		.update(thumperRunResults)
		.set({ acknowledgedAt })
		.where(eq(thumperRunResults.id, row.resultId));

	return { status: 'acknowledged' };
}
