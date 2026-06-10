import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { BLOOM_ONE_ID, BLOOM_ONE_SEED_RESOURCES } from '../seed/bloomOneSeed.js';
import { resourceInstances } from '../schema/resourceInstances.js';

export class ResourceInstanceStatsImmutableError extends Error {
	constructor(resourceInstanceId: string) {
		super(`Resource instance stats are immutable after insert: ${resourceInstanceId}`);
		this.name = 'ResourceInstanceStatsImmutableError';
	}
}

const IMMUTABLE_STAT_KEYS = [
	'statOq',
	'statConductivity',
	'statHardness',
	'statHeatResistance',
	'statMalleability'
] as const;

export type ResourceInstanceLifecyclePatch = {
	extinctAt: Date | null;
};

function assertLifecyclePatchOnly(
	resourceInstanceId: string,
	patch: Record<string, unknown>
): asserts patch is ResourceInstanceLifecyclePatch {
	for (const key of IMMUTABLE_STAT_KEYS) {
		if (key in patch) {
			throw new ResourceInstanceStatsImmutableError(resourceInstanceId);
		}
	}

	if (!('extinctAt' in patch)) {
		throw new Error(`updateResourceInstance requires extinctAt for ${resourceInstanceId}`);
	}
}

type InsertResourceInstanceInput = {
	resourceSlug: string;
	displayName: string;
	family: string;
	stats: {
		OQ: number;
		conductivity: number;
		hardness: number;
		heat_resistance: number;
		malleability: number;
	};
	bloomId: number;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	lifespanDays: number;
	spawnedAt: Date;
};

export async function insertResourceInstance(db: DbExecutor, input: InsertResourceInstanceInput) {
	const [created] = await db
		.insert(resourceInstances)
		.values({
			resourceSlug: input.resourceSlug,
			displayName: input.displayName,
			family: input.family,
			statOq: input.stats.OQ,
			statConductivity: input.stats.conductivity,
			statHardness: input.stats.hardness,
			statHeatResistance: input.stats.heat_resistance,
			statMalleability: input.stats.malleability,
			bloomId: input.bloomId,
			concentrationMinPercent: input.concentrationMinPercent,
			concentrationMaxPercent: input.concentrationMaxPercent,
			lifespanDays: input.lifespanDays,
			spawnedAt: input.spawnedAt
		})
		.returning();

	return created!;
}

/** Lifecycle-only update — stats cannot change after insert (Decision 012). */
export async function updateResourceInstance(
	db: DbExecutor,
	resourceInstanceId: string,
	patch: ResourceInstanceLifecyclePatch
) {
	assertLifecyclePatchOnly(resourceInstanceId, patch);

	const [updated] = await db
		.update(resourceInstances)
		.set({ extinctAt: patch.extinctAt })
		.where(eq(resourceInstances.id, resourceInstanceId))
		.returning();

	return updated ?? null;
}

export async function getResourceInstanceById(db: DbExecutor, resourceInstanceId: string) {
	const [row] = await db
		.select()
		.from(resourceInstances)
		.where(eq(resourceInstances.id, resourceInstanceId))
		.limit(1);

	return row ?? null;
}

export async function getResourceInstanceByBloomSlug(
	db: DbExecutor,
	bloomId: number,
	resourceSlug: string
) {
	const [row] = await db
		.select()
		.from(resourceInstances)
		.where(
			and(eq(resourceInstances.bloomId, bloomId), eq(resourceInstances.resourceSlug, resourceSlug))
		)
		.limit(1);

	return row ?? null;
}

export async function listResourceInstancesForBloom(db: DbExecutor, bloomId: number) {
	return db.select().from(resourceInstances).where(eq(resourceInstances.bloomId, bloomId));
}

/** Idempotent seed for locked bloom #1 (Decision 006 + 021). */
export async function ensureBloomOneResourceInstances(db: DbExecutor, spawnedAt = new Date()) {
	const existing = await listResourceInstancesForBloom(db, BLOOM_ONE_ID);
	if (existing.length >= BLOOM_ONE_SEED_RESOURCES.length) {
		return existing;
	}

	const created = [];
	for (const seed of BLOOM_ONE_SEED_RESOURCES) {
		const row = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, seed.resourceSlug);
		if (row) {
			created.push(row);
			continue;
		}

		created.push(
			await insertResourceInstance(db, {
				resourceSlug: seed.resourceSlug,
				displayName: seed.displayName,
				family: seed.family,
				stats: seed.stats,
				bloomId: BLOOM_ONE_ID,
				concentrationMinPercent: seed.concentrationMinPercent,
				concentrationMaxPercent: seed.concentrationMaxPercent,
				lifespanDays: seed.lifespanDays,
				spawnedAt
			})
		);
	}

	return created;
}
