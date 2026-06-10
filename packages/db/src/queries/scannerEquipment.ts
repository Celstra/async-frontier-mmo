import { SURVEY_SCANNER_MK_I } from '@async-frontier-mmo/domain';
import { and, eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';

export class EquipValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'EquipValidationError';
	}
}

export async function listScannerItemsForPilot(db: DbExecutor, pilotId: string) {
	return db
		.select()
		.from(items)
		.where(and(eq(items.pilotId, pilotId), eq(items.schematicId, SURVEY_SCANNER_MK_I.id)));
}

export async function getEquippedScannerForPilot(db: DbExecutor, pilotId: string) {
	const [pilot] = await db.select().from(pilots).where(eq(pilots.id, pilotId)).limit(1);
	if (!pilot?.equippedScannerItemId) {
		return null;
	}

	const [item] = await db
		.select()
		.from(items)
		.where(eq(items.id, pilot.equippedScannerItemId))
		.limit(1);

	return item ?? null;
}

export type EquipScannerOutcome =
	| { status: 'equipped'; item: typeof items.$inferSelect }
	| { status: 'invalid'; reason: string };

export async function equipScannerItemForPilot(
	db: Db,
	input: { pilotId: string; itemId: string }
): Promise<EquipScannerOutcome> {
	try {
		return await db.transaction(async (tx) => {
			const [item] = await tx.select().from(items).where(eq(items.id, input.itemId)).limit(1);
			if (!item) {
				throw new EquipValidationError('Scanner item not found');
			}
			if (item.pilotId !== input.pilotId) {
				throw new EquipValidationError('Scanner item does not belong to this pilot');
			}
			if (item.schematicId !== SURVEY_SCANNER_MK_I.id) {
				throw new EquipValidationError('Item is not a Survey Scanner Module Mk I');
			}

			const [pilot] = await tx
				.update(pilots)
				.set({ equippedScannerItemId: item.id })
				.where(eq(pilots.id, input.pilotId))
				.returning();

			if (!pilot) {
				throw new EquipValidationError('Pilot not found');
			}

			await appendEconomyLedgerEntry(tx, {
				eventType: 'item_equipped',
				pilotId: input.pilotId,
				payload: {
					item_id: item.id,
					schematic_id: item.schematicId,
					survey_clarity: item.propertyScores.survey_clarity ?? null
				}
			});

			return { status: 'equipped' as const, item };
		});
	} catch (error) {
		if (error instanceof EquipValidationError) {
			return { status: 'invalid', reason: error.message };
		}
		throw error;
	}
}
