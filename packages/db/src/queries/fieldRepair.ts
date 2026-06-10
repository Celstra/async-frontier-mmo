import { and, asc, eq, isNull } from 'drizzle-orm';
import {
	applyHullDamageFieldRepair,
	applyHullDamageWithoutFieldRepair,
	applyFieldRepairWithKit,
	FIELD_REPAIR_KIT,
	type FieldRepairOutcome
} from '@async-frontier-mmo/domain';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { craftSchematicForPilot, type CraftSchematicInput } from './crafting.js';
import { items } from '../schema/items.js';
import { repairActions } from '../schema/repairActions.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';

const FIELD_REPAIR_KIT_SCHEMATIC_ID = FIELD_REPAIR_KIT.id;

function kitScoresFromItem(propertyScores: Record<string, number>) {
	return {
		conditionRestored: propertyScores.condition_restored ?? 0,
		integritySafety: propertyScores.integrity_safety ?? 0,
		fieldReliability: propertyScores.field_reliability ?? 0
	};
}

export async function countFieldRepairKitsForPilot(db: DbExecutor, pilotId: string): Promise<number> {
	const rows = await db
		.select({ id: items.id })
		.from(items)
		.where(
			and(
				eq(items.pilotId, pilotId),
				eq(items.schematicId, FIELD_REPAIR_KIT_SCHEMATIC_ID),
				isNull(items.consumedAt)
			)
		);

	return rows.length;
}

async function getOldestFieldRepairKitForPilot(db: DbExecutor, pilotId: string) {
	const [kit] = await db
		.select()
		.from(items)
		.where(
			and(
				eq(items.pilotId, pilotId),
				eq(items.schematicId, FIELD_REPAIR_KIT_SCHEMATIC_ID),
				isNull(items.consumedAt)
			)
		)
		.orderBy(asc(items.createdAt))
		.limit(1);

	return kit ?? null;
}

async function consumeRepairKit(db: DbExecutor, kitItemId: string) {
	const consumedAt = new Date();
	const [kit] = await db
		.update(items)
		.set({ consumedAt })
		.where(and(eq(items.id, kitItemId), isNull(items.consumedAt)))
		.returning();

	return kit ?? null;
}

async function updateRunHullDurability(
	db: DbExecutor,
	thumperRunId: string,
	outcome: FieldRepairOutcome
) {
	const [run] = await db
		.update(thumperRuns)
		.set({
			runHullCondition: outcome.conditionAfter,
			runHullIntegrity: outcome.integrityAfter
		})
		.where(eq(thumperRuns.id, thumperRunId))
		.returning();

	return run ?? null;
}

async function insertRepairActionAudit(
	db: DbExecutor,
	input: {
		pilotId: string;
		repairKitItemId: string;
		thumperRunId: string;
		thumperEventWindowIndex: number;
		context: string;
		outcome: FieldRepairOutcome;
		kitConditionRestoredScore: number;
		kitIntegritySafetyScore: number;
	}
) {
	const [row] = await db
		.insert(repairActions)
		.values({
			pilotId: input.pilotId,
			repairKitItemId: input.repairKitItemId,
			thumperRunId: input.thumperRunId,
			thumperEventWindowIndex: input.thumperEventWindowIndex,
			context: input.context,
			conditionBefore: input.outcome.conditionBefore,
			conditionAfter: input.outcome.conditionAfter,
			integrityBefore: input.outcome.integrityBefore,
			integrityAfter: input.outcome.integrityAfter,
			kitConditionRestoredScore: input.kitConditionRestoredScore,
			kitIntegritySafetyScore: input.kitIntegritySafetyScore,
			explanation: input.outcome.explanation
		})
		.returning();

	await appendEconomyLedgerEntry(db, {
		eventType: 'repair_kit_consumed',
		pilotId: input.pilotId,
		payload: {
			source_type: 'repair_action',
			source_id: row!.id,
			repair_kit_item_id: input.repairKitItemId,
			thumper_run_id: input.thumperRunId,
			thumper_event_window_index: input.thumperEventWindowIndex,
			context: input.context
		}
	});

	await appendEconomyLedgerEntry(db, {
		eventType: 'item_repaired',
		pilotId: input.pilotId,
		payload: {
			source_type: 'repair_action',
			source_id: row!.id,
			thumper_run_id: input.thumperRunId,
			condition_before: input.outcome.conditionBefore,
			condition_after: input.outcome.conditionAfter,
			integrity_before: input.outcome.integrityBefore,
			integrity_after: input.outcome.integrityAfter,
			explanation: input.outcome.explanation
		}
	});

	await appendEconomyLedgerEntry(db, {
		eventType: 'item_condition_changed',
		pilotId: input.pilotId,
		payload: {
			source_type: 'repair_action',
			source_id: row!.id,
			thumper_run_id: input.thumperRunId,
			condition_delta: input.outcome.conditionAfter - input.outcome.conditionBefore,
			integrity_delta: input.outcome.integrityAfter - input.outcome.integrityBefore
		}
	});

	return row!;
}

export type RecordThumperResponseInput = {
	pilotId: string;
	thumperRunId: string;
	windowIndex: number;
	complication: string;
	chosenResponse: string;
	runHullCondition: number;
	runHullIntegrity: number;
};

export type RecordThumperResponseOutcome =
	| { status: 'recorded'; fieldRepairKitCount: number }
	| { status: 'not_recorded' }
	| { status: 'no_repair_kit' };

/**
 * Records an event-window response and applies field-repair side effects when chosen.
 */
export class FieldRepairKitUnavailableError extends Error {
	constructor() {
		super('Field Repair kit unavailable');
		this.name = 'FieldRepairKitUnavailableError';
	}
}

export async function recordThumperEventWindowResponseForPilot(
	db: Db,
	input: RecordThumperResponseInput
): Promise<RecordThumperResponseOutcome> {
	return db.transaction(async (tx) => {
		if (input.chosenResponse === 'field_repair') {
			const kitAvailable = await getOldestFieldRepairKitForPilot(tx, input.pilotId);
			if (!kitAvailable) {
				return { status: 'no_repair_kit' };
			}
		}

		const recorded = await recordThumperEventWindowResponse(tx, {
			thumperRunId: input.thumperRunId,
			windowIndex: input.windowIndex,
			chosenResponse: input.chosenResponse
		});

		if (!recorded) {
			return { status: 'not_recorded' };
		}

		if (input.chosenResponse === 'field_repair') {
			const kit = await getOldestFieldRepairKitForPilot(tx, input.pilotId);
			if (!kit) {
				throw new FieldRepairKitUnavailableError();
			}

			const kitScores = kitScoresFromItem(kit.propertyScores);
			const before = {
				condition: input.runHullCondition,
				integrity: input.runHullIntegrity
			};
			const outcome =
				input.complication === 'hull_damage'
					? applyHullDamageFieldRepair(before, kitScores)
					: applyFieldRepairWithKit(before, kitScores);

			const consumed = await consumeRepairKit(tx, kit.id);
			if (!consumed) {
				throw new FieldRepairKitUnavailableError();
			}

			await updateRunHullDurability(tx, input.thumperRunId, outcome);
			await insertRepairActionAudit(tx, {
				pilotId: input.pilotId,
				repairKitItemId: kit.id,
				thumperRunId: input.thumperRunId,
				thumperEventWindowIndex: input.windowIndex,
				context: 'field_repair_during_run',
				outcome,
				kitConditionRestoredScore: kitScores.conditionRestored,
				kitIntegritySafetyScore: kitScores.integritySafety
			});
		} else if (input.complication === 'hull_damage' && input.chosenResponse === 'hold') {
			const afterHold = applyHullDamageWithoutFieldRepair({
				condition: input.runHullCondition,
				integrity: input.runHullIntegrity
			});
			await tx
				.update(thumperRuns)
				.set({
					runHullCondition: afterHold.condition,
					runHullIntegrity: afterHold.integrity
				})
				.where(eq(thumperRuns.id, input.thumperRunId));
		}

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(tx, input.pilotId);
		return { status: 'recorded', fieldRepairKitCount };
	});
}

/** Convenience wrapper for crafting a Field Repair Kit. */
export function craftFieldRepairKitForPilot(db: Db, input: Omit<CraftSchematicInput, 'schematic'>) {
	return craftSchematicForPilot(db, { ...input, schematic: FIELD_REPAIR_KIT });
}
