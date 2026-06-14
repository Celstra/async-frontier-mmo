import { accrueEnergy, resolveSurveyEnergy, SURVEY_ENERGY_CAP } from '@async-frontier-mmo/domain';
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { pilotSurveyEnergy } from '../schema/pilotSurveyEnergy.js';

export type PersistedSurveyEnergy = {
	rawEnergy: number;
	updatedAt: Date;
};

export async function ensurePilotSurveyEnergyRow(
	db: DbExecutor,
	pilotId: string,
	now: Date
): Promise<PersistedSurveyEnergy> {
	const [existing] = await db
		.select()
		.from(pilotSurveyEnergy)
		.where(eq(pilotSurveyEnergy.pilotId, pilotId))
		.limit(1);

	if (existing) {
		return { rawEnergy: existing.rawEnergy, updatedAt: existing.updatedAt };
	}

	const [created] = await db
		.insert(pilotSurveyEnergy)
		.values({
			pilotId,
			rawEnergy: SURVEY_ENERGY_CAP,
			updatedAt: now
		})
		.onConflictDoNothing()
		.returning();

	if (created) {
		return { rawEnergy: created.rawEnergy, updatedAt: created.updatedAt };
	}

	const [loaded] = await db
		.select()
		.from(pilotSurveyEnergy)
		.where(eq(pilotSurveyEnergy.pilotId, pilotId))
		.limit(1);

	if (!loaded) {
		throw new Error(`Failed to ensure survey energy row for pilot ${pilotId}`);
	}

	return { rawEnergy: loaded.rawEnergy, updatedAt: loaded.updatedAt };
}

export function resolveStoredSurveyEnergy(
	row: PersistedSurveyEnergy,
	nowMs: number
): { energy: number; lastUpdatedAtMs: number; rawEnergy: number; updatedAt: Date } {
	const resolved = resolveSurveyEnergy({
		storedEnergy: row.rawEnergy,
		lastUpdatedAtMs: row.updatedAt.getTime(),
		nowMs
	});

	return {
		energy: resolved.energy,
		lastUpdatedAtMs: resolved.lastUpdatedAtMs,
		rawEnergy: resolved.energy,
		updatedAt: new Date(resolved.lastUpdatedAtMs)
	};
}

/** Persist accrued raw energy at `nowMs` — used after spend and for accrual round-trips. */
export async function persistSurveyEnergyAt(
	db: DbExecutor,
	input: {
		pilotId: string;
		rawEnergy: number;
		updatedAtMs: number;
		expectedRawEnergy?: number;
		expectedUpdatedAt?: Date;
	}
): Promise<boolean> {
	const conditions = [eq(pilotSurveyEnergy.pilotId, input.pilotId)];

	if (input.expectedRawEnergy !== undefined) {
		conditions.push(eq(pilotSurveyEnergy.rawEnergy, input.expectedRawEnergy));
	}
	if (input.expectedUpdatedAt !== undefined) {
		conditions.push(eq(pilotSurveyEnergy.updatedAt, input.expectedUpdatedAt));
	}

	const [updated] = await db
		.update(pilotSurveyEnergy)
		.set({
			rawEnergy: input.rawEnergy,
			updatedAt: new Date(input.updatedAtMs)
		})
		.where(and(...conditions))
		.returning();

	return Boolean(updated);
}

export async function accrueAndPersistSurveyEnergy(
	db: DbExecutor,
	input: { pilotId: string; nowMs: number }
): Promise<{ rawEnergy: number; updatedAt: Date }> {
	const row = await ensurePilotSurveyEnergyRow(db, input.pilotId, new Date(input.nowMs));
	const accrued = accrueEnergy(
		{ rawEnergy: row.rawEnergy, updatedAtMs: row.updatedAt.getTime() },
		input.nowMs
	);

	await db
		.update(pilotSurveyEnergy)
		.set({
			rawEnergy: accrued.rawEnergy,
			updatedAt: new Date(accrued.updatedAtMs)
		})
		.where(eq(pilotSurveyEnergy.pilotId, input.pilotId));

	return {
		rawEnergy: accrued.rawEnergy,
		updatedAt: new Date(accrued.updatedAtMs)
	};
}

export async function refillSurveyEnergyToCap(
	db: DbExecutor,
	pilotId: string,
	now: Date
): Promise<{ rawEnergy: number; updatedAt: Date }> {
	await ensurePilotSurveyEnergyRow(db, pilotId, now);

	const [updated] = await db
		.update(pilotSurveyEnergy)
		.set({
			rawEnergy: SURVEY_ENERGY_CAP,
			updatedAt: now
		})
		.where(eq(pilotSurveyEnergy.pilotId, pilotId))
		.returning();

	return { rawEnergy: updated.rawEnergy, updatedAt: updated.updatedAt };
}
