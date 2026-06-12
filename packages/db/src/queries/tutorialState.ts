import { eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { pilotTutorialState } from '../schema/pilotTutorialState.js';

export async function getPilotTutorialStep(
	db: DbExecutor,
	pilotId: string
): Promise<string | null> {
	const [row] = await db
		.select({ step: pilotTutorialState.step })
		.from(pilotTutorialState)
		.where(eq(pilotTutorialState.pilotId, pilotId))
		.limit(1);

	return row?.step ?? null;
}

export async function setPilotTutorialStep(
	db: DbExecutor,
	input: { pilotId: string; step: string; updatedAt?: Date }
) {
	const updatedAt = input.updatedAt ?? new Date();

	await db
		.insert(pilotTutorialState)
		.values({
			pilotId: input.pilotId,
			step: input.step,
			updatedAt
		})
		.onConflictDoUpdate({
			target: pilotTutorialState.pilotId,
			set: {
				step: input.step,
				updatedAt
			}
		});
}

/** Test helper — remove tutorial row for a pilot. */
export async function clearPilotTutorialState(db: DbExecutor, pilotId: string) {
	await db.delete(pilotTutorialState).where(eq(pilotTutorialState.pilotId, pilotId));
}
