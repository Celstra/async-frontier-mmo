import {
	aggregateProvenanceByResourceInstance,
	computeReclaimReturnsByResourceInstance,
	type NamedResourceId
} from '@async-frontier-mmo/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { items } from '../schema/items.js';
import { workshopReclaims } from '../schema/workshopReclaims.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import {
	assertWorkshopSliceCraftItem,
	getPilotItemById,
	WorkshopItemNotFoundError
} from './workshopSlice.js';

export class WorkshopReclaimValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WorkshopReclaimValidationError';
	}
}

export type ReclaimWorkshopItemInput = {
	pilotId: string;
	itemId: string;
	idempotencyKey: string;
	confirmFavorited?: boolean;
	now?: Date;
};

export type ReclaimWorkshopItemOutcome =
	| {
			status: 'reclaimed';
			item: typeof items.$inferSelect;
			reclaim: typeof workshopReclaims.$inferSelect;
			returnedResources: typeof workshopReclaims.$inferSelect.returnedResources;
	  }
	| {
			status: 'already_reclaimed';
			item: typeof items.$inferSelect;
			reclaim: typeof workshopReclaims.$inferSelect;
			returnedResources: typeof workshopReclaims.$inferSelect.returnedResources;
	  };

function provenanceToInstanceConsumption(provenance: (typeof items.$inferSelect)['provenance']) {
	return aggregateProvenanceByResourceInstance(
		provenance.map((line) => ({
			resourceInstanceId: line.resourceInstanceId,
			resourceSlug: line.resourceSlug as NamedResourceId,
			quantityConsumed: line.quantityConsumed
		}))
	);
}

export async function getWorkshopReclaimByIdempotency(
	db: DbExecutor,
	pilotId: string,
	idempotencyKey: string
) {
	const [row] = await db
		.select()
		.from(workshopReclaims)
		.where(
			and(
				eq(workshopReclaims.pilotId, pilotId),
				eq(workshopReclaims.idempotencyKey, idempotencyKey)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function reclaimWorkshopItemForPilot(
	db: Db,
	input: ReclaimWorkshopItemInput
): Promise<ReclaimWorkshopItemOutcome> {
	const now = input.now ?? new Date();

	return db.transaction(async (tx) => {
		const existing = await getWorkshopReclaimByIdempotency(tx, input.pilotId, input.idempotencyKey);
		if (existing) {
			const item = await getPilotItemById(tx, input.pilotId, existing.itemId);
			if (!item) {
				throw new WorkshopItemNotFoundError(existing.itemId);
			}
			return {
				status: 'already_reclaimed' as const,
				item,
				reclaim: existing,
				returnedResources: existing.returnedResources
			};
		}

		const item = await getPilotItemById(tx, input.pilotId, input.itemId);
		if (!item) {
			throw new WorkshopItemNotFoundError(input.itemId);
		}

		if (item.reclaimedAt) {
			throw new WorkshopReclaimValidationError('Item has already been reclaimed');
		}

		await assertWorkshopSliceCraftItem(tx, item);

		if (item.favoritedAt && !input.confirmFavorited) {
			throw new WorkshopReclaimValidationError(
				'Favorited items require explicit confirmation before reclaim'
			);
		}

		const consumed = provenanceToInstanceConsumption(item.provenance);
		const returned = computeReclaimReturnsByResourceInstance(consumed);
		const returnedResources = [];

		for (const line of returned) {
			await grantResourceToPilotTx(tx, {
				pilotId: input.pilotId,
				resourceInstanceId: line.resourceInstanceId,
				quantity: line.quantity,
				source: { type: 'workshop_reclaim', id: input.itemId }
			});

			returnedResources.push({
				resourceSlug: line.resourceSlug,
				resourceInstanceId: line.resourceInstanceId,
				quantity: line.quantity
			});
		}

		const [reclaimedItem] = await tx
			.update(items)
			.set({ reclaimedAt: now })
			.where(
				and(
					eq(items.id, item.id),
					eq(items.pilotId, input.pilotId),
					isNull(items.reclaimedAt)
				)
			)
			.returning();

		if (!reclaimedItem) {
			throw new WorkshopReclaimValidationError('Item reclaim raced with another request');
		}

		const [reclaim] = await tx
			.insert(workshopReclaims)
			.values({
				pilotId: input.pilotId,
				itemId: item.id,
				idempotencyKey: input.idempotencyKey,
				returnedResources
			})
			.returning();

		await appendEconomyLedgerEntry(tx, {
			eventType: 'resource_granted',
			pilotId: input.pilotId,
			payload: {
				source_type: 'workshop_item_reclaimed',
				source_id: item.id,
				idempotency_key: input.idempotencyKey,
				returned_resources: returnedResources
			},
			createdAt: now
		});

		return {
			status: 'reclaimed' as const,
			item: reclaimedItem,
			reclaim: reclaim!,
			returnedResources
		};
	});
}
