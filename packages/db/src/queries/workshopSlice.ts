import {
	buildWorkshopStarterGrant,
	isWorkshopActiveSchematic,
	listWorkshopBenchResources,
	WORKSHOP_ACTIVE_SCHEMATIC_IDS,
	WORKSHOP_STARTER_GRANT_UNITS,
	WORKSHOP_TIMER_CRATE_MINUTES
} from '@async-frontier-mmo/domain';
import { and, desc, eq, inArray, isNull, sql } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { items } from '../schema/items.js';
import { pilotWorkshopState } from '../schema/pilotWorkshopState.js';
import {
	getResourceInstanceByBloomSlug,
	insertResourceInstance,
	listResourceInstancesForBloom
} from './resourceInstances.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import {
	WORKSHOP_BENCH_BLOOM_ID,
	workshopBenchSeedResources
} from '../seed/workshopBenchSeed.js';
import { isWorkshopBenchResourceInstance } from './workshopBenchInventory.js';

export class WorkshopItemNotFoundError extends Error {
	constructor(itemId: string) {
		super(`Workshop item not found: ${itemId}`);
		this.name = 'WorkshopItemNotFoundError';
	}
}

export class WorkshopSliceItemValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WorkshopSliceItemValidationError';
	}
}

/** Reclaim/favorite may only target active workshop crafts built from bloom-0 bench stock. */
export async function assertWorkshopSliceCraftItem(
	db: DbExecutor,
	item: typeof items.$inferSelect
): Promise<void> {
	if (!isWorkshopActiveSchematic(item.schematicId)) {
		throw new WorkshopSliceItemValidationError('Item is not an active workshop schematic craft');
	}

	if (item.consumedAt) {
		throw new WorkshopSliceItemValidationError('Consumed items cannot use workshop slice actions');
	}

	for (const line of item.provenance) {
		if (!(await isWorkshopBenchResourceInstance(db, line.resourceInstanceId))) {
			throw new WorkshopSliceItemValidationError(
				'Item provenance includes non-bench workshop stock'
			);
		}
	}
}

/** Idempotent seed for workshop bench resource instances (bloom 0). */
export async function ensureWorkshopBenchResourceInstances(db: DbExecutor, spawnedAt = new Date()) {
	const seeds = workshopBenchSeedResources();
	const existing = await listResourceInstancesForBloom(db, WORKSHOP_BENCH_BLOOM_ID);
	if (existing.length >= seeds.length) {
		return existing;
	}

	const created = [];
	for (const seed of seeds) {
		const row = await getResourceInstanceByBloomSlug(
			db,
			WORKSHOP_BENCH_BLOOM_ID,
			seed.resourceSlug
		);
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
				bloomId: WORKSHOP_BENCH_BLOOM_ID,
				concentrationMinPercent: seed.concentrationMinPercent,
				concentrationMaxPercent: seed.concentrationMaxPercent,
				lifespanDays: seed.lifespanDays,
				spawnedAt
			})
		);
	}

	return created;
}

export async function getWorkshopBenchInstanceBySlug(db: DbExecutor, resourceSlug: string) {
	const row = await getResourceInstanceByBloomSlug(db, WORKSHOP_BENCH_BLOOM_ID, resourceSlug);
	if (!row) {
		throw new Error(`Missing workshop bench instance for slug: ${resourceSlug}`);
	}
	return row;
}

export async function getPilotWorkshopState(db: DbExecutor, pilotId: string) {
	const [row] = await db
		.select()
		.from(pilotWorkshopState)
		.where(eq(pilotWorkshopState.pilotId, pilotId))
		.limit(1);
	return row ?? null;
}

export async function ensurePilotWorkshopStateTx(db: DbExecutor, pilotId: string, now = new Date()) {
	const existing = await getPilotWorkshopState(db, pilotId);
	if (existing) {
		return existing;
	}

	const nextTimedCrateAt = new Date(now.getTime() + WORKSHOP_TIMER_CRATE_MINUTES * 60_000);
	const [created] = await db
		.insert(pilotWorkshopState)
		.values({
			pilotId,
			craftCountSinceCrate: 0,
			crateSequence: 0,
			nextTimedCrateAt,
			updatedAt: now
		})
		.onConflictDoNothing()
		.returning();

	if (created) {
		return created;
	}

	return (await getPilotWorkshopState(db, pilotId))!;
}

export type WorkshopStarterGrantOutcome =
	| { status: 'granted'; grantedLines: number }
	| { status: 'already_granted' };

/** Idempotent starter bench stock grant — 180u of each workshop bench resource. */
export async function ensureWorkshopStarterGrantForPilot(
	db: Db,
	pilotId: string,
	now = new Date()
): Promise<WorkshopStarterGrantOutcome> {
	return db.transaction(async (tx) => {
		await ensureWorkshopBenchResourceInstances(tx, now);
		const state = await ensurePilotWorkshopStateTx(tx, pilotId, now);

		if (state.starterGrantedAt) {
			return { status: 'already_granted' as const };
		}

		const [claimed] = await tx
			.update(pilotWorkshopState)
			.set({ starterGrantedAt: now, updatedAt: now })
			.where(
				and(eq(pilotWorkshopState.pilotId, pilotId), sql`${pilotWorkshopState.starterGrantedAt} IS NULL`)
			)
			.returning();

		if (!claimed) {
			return { status: 'already_granted' as const };
		}

		const grantLines = buildWorkshopStarterGrant();
		for (const line of grantLines) {
			const instance = await getWorkshopBenchInstanceBySlug(tx, line.resourceSlug);
			await grantResourceToPilotTx(tx, {
				pilotId,
				resourceInstanceId: instance.id,
				quantity: line.quantity,
				source: { type: 'workshop_starter_grant', id: pilotId }
			});
		}

		await appendEconomyLedgerEntry(tx, {
			eventType: 'resource_granted',
			pilotId,
			payload: {
				source_type: 'workshop_starter_grant',
				source_id: pilotId,
				resource_count: grantLines.length,
				units_per_resource: WORKSHOP_STARTER_GRANT_UNITS
			},
			createdAt: now
		});

		return { status: 'granted' as const, grantedLines: grantLines.length };
	});
}

export async function setItemFavoriteForPilot(
	db: Db,
	input: { pilotId: string; itemId: string; favorited: boolean; now?: Date }
) {
	const item = await getPilotItemById(db, input.pilotId, input.itemId);
	if (!item) {
		throw new WorkshopItemNotFoundError(input.itemId);
	}

	await assertWorkshopSliceCraftItem(db, item);

	const now = input.now ?? new Date();
	const [updated] = await db
		.update(items)
		.set({ favoritedAt: input.favorited ? now : null })
		.where(and(eq(items.id, input.itemId), eq(items.pilotId, input.pilotId), sql`${items.reclaimedAt} IS NULL`))
		.returning();

	if (!updated) {
		throw new WorkshopItemNotFoundError(input.itemId);
	}

	return updated;
}

export async function getPilotItemById(db: DbExecutor, pilotId: string, itemId: string) {
	const [row] = await db
		.select()
		.from(items)
		.where(and(eq(items.id, itemId), eq(items.pilotId, pilotId)))
		.limit(1);
	return row ?? null;
}

export function listWorkshopBenchResourceSlugs(): string[] {
	return listWorkshopBenchResources().map((resource) => resource.id);
}

/** Active workshop-slice crafts that can still be compared, favorited, or reclaimed. */
export async function listWorkshopCraftedItemsForPilot(db: DbExecutor, pilotId: string) {
	return db
		.select()
		.from(items)
		.where(
			and(
				eq(items.pilotId, pilotId),
				isNull(items.consumedAt),
				isNull(items.reclaimedAt),
				inArray(items.schematicId, [...WORKSHOP_ACTIVE_SCHEMATIC_IDS])
			)
		)
		.orderBy(desc(items.createdAt));
}
