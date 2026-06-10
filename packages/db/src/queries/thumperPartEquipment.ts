import {
	STARTER_WORN_THUMPER_PARTS,
	SURVEY_SCANNER_MK_I,
	isThumperPartSchematic,
	thumperPartSlotForSchematic,
	type ThumperPartSnapshot
} from '@async-frontier-mmo/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';

export class ThumperPartEquipValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'ThumperPartEquipValidationError';
	}
}

export async function listThumperPartItemsForPilot(db: DbExecutor, pilotId: string) {
	const rows = await db.select().from(items).where(eq(items.pilotId, pilotId));
	return rows.filter((item) => isThumperPartSchematic(item.schematicId) && item.consumedAt === null);
}

export async function getEquippedThumperPartsForPilot(db: DbExecutor, pilotId: string) {
	const [pilot] = await db.select().from(pilots).where(eq(pilots.id, pilotId)).limit(1);
	if (!pilot) {
		return { drill: null, pump: null, hull: null };
	}

	async function load(itemId: string | null) {
		if (!itemId) {
			return null;
		}
		const [item] = await db.select().from(items).where(eq(items.id, itemId)).limit(1);
		return item ?? null;
	}

	return {
		drill: await load(pilot.equippedDrillItemId),
		pump: await load(pilot.equippedPumpItemId),
		hull: await load(pilot.equippedHullItemId)
	};
}

export function itemToPartSnapshot(
	item: typeof items.$inferSelect,
	slot: 'drill' | 'pump' | 'hull'
): ThumperPartSnapshot {
	return {
		slot,
		itemId: item.id,
		schematicId: item.schematicId,
		displayName: item.displayName,
		propertyScores: item.propertyScores,
		condition: item.condition,
		integrity: item.integrity
	};
}

/** Decision 011 — grant worn drill/pump/hull once and equip them. */
export async function ensureStarterThumperPartsForPilot(db: Db, pilotId: string) {
	const [pilot] = await db.select().from(pilots).where(eq(pilots.id, pilotId)).limit(1);
	if (pilot?.starterThumperPartsGrantedAt) {
		return { granted: false as const };
	}

	return db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(pilots)
			.set({ starterThumperPartsGrantedAt: new Date() })
			.where(and(eq(pilots.id, pilotId), isNull(pilots.starterThumperPartsGrantedAt)))
			.returning();

		if (!claimed) {
			return { granted: false as const };
		}

		const equippedIds: Partial<Record<'drill' | 'pump' | 'hull', string>> = {};

		for (const worn of STARTER_WORN_THUMPER_PARTS) {
			const [item] = await tx
				.insert(items)
				.values({
					pilotId,
					schematicId: worn.schematicId,
					schematicVersion: 1,
					displayName: worn.displayName,
					propertyScores: worn.propertyScores,
					provenance: [],
					condition: worn.condition,
					integrity: worn.integrity
				})
				.returning();

			equippedIds[worn.slot] = item!.id;

			await appendEconomyLedgerEntry(tx, {
				eventType: 'item_crafted',
				pilotId,
				payload: {
					source_type: 'starter_thumper_parts',
					item_id: item!.id,
					schematic_id: worn.schematicId,
					slot: worn.slot
				}
			});
		}

		await tx
			.update(pilots)
			.set({
				equippedDrillItemId: equippedIds.drill,
				equippedPumpItemId: equippedIds.pump,
				equippedHullItemId: equippedIds.hull
			})
			.where(eq(pilots.id, pilotId));

		for (const worn of STARTER_WORN_THUMPER_PARTS) {
			await appendEconomyLedgerEntry(tx, {
				eventType: 'item_equipped',
				pilotId,
				payload: {
					action: 'equip',
					slot: worn.slot,
					item_id: equippedIds[worn.slot],
					schematic_id: worn.schematicId,
					source_type: 'starter_thumper_parts'
				}
			});
		}

		return { granted: true as const };
	});
}

export type EquipThumperPartOutcome =
	| { status: 'equipped'; item: typeof items.$inferSelect; slot: 'drill' | 'pump' | 'hull' }
	| { status: 'unequipped'; slot: 'drill' | 'pump' | 'hull' }
	| { status: 'invalid'; reason: string };

export async function equipThumperPartForPilot(
	db: Db,
	input: {
		pilotId: string;
		slot: 'drill' | 'pump' | 'hull';
		itemId: string | null;
	}
): Promise<EquipThumperPartOutcome> {
	try {
		return await db.transaction(async (tx) => {
			if (input.itemId === null) {
				const unequipSet =
					input.slot === 'drill'
						? { equippedDrillItemId: null }
						: input.slot === 'pump'
							? { equippedPumpItemId: null }
							: { equippedHullItemId: null };

				const [pilot] = await tx
					.update(pilots)
					.set(unequipSet)
					.where(eq(pilots.id, input.pilotId))
					.returning();

				if (!pilot) {
					throw new ThumperPartEquipValidationError('Pilot not found');
				}

				await appendEconomyLedgerEntry(tx, {
					eventType: 'item_equipped',
					pilotId: input.pilotId,
					payload: { action: 'unequip', slot: input.slot }
				});

				return { status: 'unequipped' as const, slot: input.slot };
			}

			const [item] = await tx.select().from(items).where(eq(items.id, input.itemId)).limit(1);
			if (!item) {
				throw new ThumperPartEquipValidationError('Thumper part item not found');
			}
			if (item.pilotId !== input.pilotId) {
				throw new ThumperPartEquipValidationError('Item does not belong to this pilot');
			}
			if (item.consumedAt) {
				throw new ThumperPartEquipValidationError('Cannot equip a consumed item');
			}
			if (item.schematicId === SURVEY_SCANNER_MK_I.id) {
				throw new ThumperPartEquipValidationError('Survey scanner is not a thumper part');
			}
			if (!isThumperPartSchematic(item.schematicId)) {
				throw new ThumperPartEquipValidationError('Item is not a thumper part');
			}

			const expectedSlot = thumperPartSlotForSchematic(item.schematicId);
			if (expectedSlot !== input.slot) {
				throw new ThumperPartEquipValidationError(
					`${item.displayName} belongs in the ${expectedSlot} slot, not ${input.slot}`
				);
			}

			const equipSet =
				input.slot === 'drill'
					? { equippedDrillItemId: item.id }
					: input.slot === 'pump'
						? { equippedPumpItemId: item.id }
						: { equippedHullItemId: item.id };

			await tx.update(pilots).set(equipSet).where(eq(pilots.id, input.pilotId));

			await appendEconomyLedgerEntry(tx, {
				eventType: 'item_equipped',
				pilotId: input.pilotId,
				payload: {
					action: 'equip',
					slot: input.slot,
					item_id: item.id,
					schematic_id: item.schematicId
				}
			});

			return { status: 'equipped' as const, item, slot: input.slot };
		});
	} catch (error) {
		if (error instanceof ThumperPartEquipValidationError) {
			return { status: 'invalid', reason: error.message };
		}
		throw error;
	}
}
