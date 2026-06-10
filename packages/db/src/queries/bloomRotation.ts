import { generateBloom } from '@async-frontier-mmo/domain';
import { and, desc, eq, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { blooms } from '../schema/blooms.js';
import { resourceInstances } from '../schema/resourceInstances.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import {
	getActiveBloomId,
	insertResourceInstance,
	listAllResourceDisplayNames
} from './resourceInstances.js';

export type RotateBloomOutcome =
	| {
			status: 'rotated';
			previousBloomId: number;
			newBloomId: number;
			generationSeed: string;
			spawnedResourceCount: number;
	  }
	| { status: 'no_active_bloom' };

async function getNextBloomId(db: DbExecutor): Promise<number> {
	const [latestBloom] = await db
		.select({ id: blooms.id })
		.from(blooms)
		.orderBy(desc(blooms.id))
		.limit(1);

	if (latestBloom) {
		return latestBloom.id + 1;
	}

	const activeBloomId = await getActiveBloomId(db);
	return activeBloomId + 1;
}

/**
 * Manual bloom rotation (Decision 018) — extinct current spawnables, persist next generated bloom.
 * Claimed stacks and crafted provenance are untouched (instance rows remain; only extinctAt changes).
 */
export async function rotateActiveBloom(
	db: Db,
	input: { pilotId?: string; now?: Date } = {}
): Promise<RotateBloomOutcome> {
	const now = input.now ?? new Date();

	return db.transaction(async (tx) => {
		const previousBloomId = await getActiveBloomId(tx);
		const activeRows = await tx
			.select({ id: resourceInstances.id })
			.from(resourceInstances)
			.where(
				and(
					eq(resourceInstances.bloomId, previousBloomId),
					isNull(resourceInstances.extinctAt)
				)
			);

		if (activeRows.length === 0) {
			return { status: 'no_active_bloom' };
		}

		await tx
			.update(resourceInstances)
			.set({ extinctAt: now })
			.where(
				and(
					eq(resourceInstances.bloomId, previousBloomId),
					isNull(resourceInstances.extinctAt)
				)
			);

		await tx
			.update(blooms)
			.set({ rotatedAt: now })
			.where(eq(blooms.id, previousBloomId));

		const newBloomId = await getNextBloomId(tx);
		const generationSeed = `red-mesa-bloom-${newBloomId}`;
		const reservedDisplayNames = new Set(await listAllResourceDisplayNames(tx));
		const generated = generateBloom({ seed: generationSeed, reservedDisplayNames });

		await tx.insert(blooms).values({
			id: newBloomId,
			generationSeed,
			createdAt: now
		});

		for (const resource of generated.resources) {
			await insertResourceInstance(tx, {
				resourceSlug: resource.resourceSlug,
				displayName: resource.displayName,
				family: resource.family,
				stats: resource.stats,
				bloomId: newBloomId,
				concentrationMinPercent: resource.concentrationMinPercent,
				concentrationMaxPercent: resource.concentrationMaxPercent,
				lifespanDays: resource.lifespanDays,
				spawnedAt: now
			});
		}

		await appendEconomyLedgerEntry(tx, {
			eventType: 'bloom_rotated',
			pilotId: input.pilotId,
			payload: {
				previous_bloom_id: previousBloomId,
				new_bloom_id: newBloomId,
				generation_seed: generationSeed,
				extinct_resource_count: activeRows.length,
				spawned_resource_count: generated.resources.length
			},
			createdAt: now
		});

		return {
			status: 'rotated',
			previousBloomId,
			newBloomId,
			generationSeed,
			spawnedResourceCount: generated.resources.length
		};
	});
}

export async function getBloomRecord(db: DbExecutor, bloomId: number) {
	const [row] = await db.select().from(blooms).where(eq(blooms.id, bloomId)).limit(1);
	return row ?? null;
}

export { BLOOM_ONE_ID };
