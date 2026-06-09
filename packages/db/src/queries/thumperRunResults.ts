import { eq } from 'drizzle-orm';
import type { Db } from '../client.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';

export async function insertThumperRunResult(
	db: Db,
	input: {
		thumperRunId: string;
		targetResourceId: string;
		projectedRecovery: number;
		recoveredQuantity: number;
		wasteQuantity: number;
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
			explanation: input.explanation,
			resolvedAt: input.resolvedAt
		})
		.returning();

	return row;
}

export async function getThumperRunResultForRun(db: Db, thumperRunId: string) {
	const [row] = await db
		.select()
		.from(thumperRunResults)
		.where(eq(thumperRunResults.thumperRunId, thumperRunId))
		.limit(1);

	return row ?? null;
}
