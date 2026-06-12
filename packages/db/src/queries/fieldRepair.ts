import { and, asc, eq, isNull } from 'drizzle-orm';
import {
	applyHullDamageFieldRepair,
	applyHullDamageWithoutFieldRepair,
	applyFieldRepairWithKit,
	FIELD_REPAIR_KIT,
	parseEventWindowSeverity,
	resolveEventWindowOutcome,
	SURVEY_SCANNER_MK_I,
	isThumperPartSchematic,
	type EventWindowMeterSnapshot,
	type FieldRepairOutcome,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse
} from '@async-frontier-mmo/domain';
import { parseFrameId } from 'shared';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry, appendItemConditionChangedLedger } from './economyLedger.js';
import { craftSchematicForPilot, type CraftSchematicInput } from './crafting.js';
import { items } from '../schema/items.js';
import { repairActions } from '../schema/repairActions.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';
import { getRunHullItemForRepair } from './thumperRunParts.js';

const FIELD_REPAIR_KIT_SCHEMATIC_ID = FIELD_REPAIR_KIT.id;

function isRepairKitTargetSchematic(schematicId: string): boolean {
	if (schematicId === FIELD_REPAIR_KIT_SCHEMATIC_ID) {
		return false;
	}
	return isThumperPartSchematic(schematicId) || schematicId === SURVEY_SCANNER_MK_I.id;
}

function kitScoresFromItem(propertyScores: Record<string, number>) {
	return {
		conditionRestored: Math.round(propertyScores.condition_restored ?? 0),
		integritySafety: Math.round(propertyScores.integrity_safety ?? 0),
		fieldReliability: Math.round(propertyScores.field_reliability ?? 0)
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
		targetItemId: string;
		thumperRunId?: string | null;
		thumperEventWindowIndex?: number | null;
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
			thumperRunId: input.thumperRunId ?? null,
			thumperEventWindowIndex: input.thumperEventWindowIndex ?? null,
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
			target_item_id: input.targetItemId,
			thumper_run_id: input.thumperRunId ?? null,
			thumper_event_window_index: input.thumperEventWindowIndex ?? null,
			context: input.context
		}
	});

	await appendEconomyLedgerEntry(db, {
		eventType: 'item_repaired',
		pilotId: input.pilotId,
		payload: {
			source_type: 'repair_action',
			source_id: row!.id,
			target_item_id: input.targetItemId,
			thumper_run_id: input.thumperRunId ?? null,
			condition_before: input.outcome.conditionBefore,
			condition_after: input.outcome.conditionAfter,
			integrity_before: input.outcome.integrityBefore,
			integrity_after: input.outcome.integrityAfter,
			explanation: input.outcome.explanation
		}
	});

	await appendItemConditionChangedLedger(db, {
		pilotId: input.pilotId,
		targetItemId: input.targetItemId,
		conditionBefore: input.outcome.conditionBefore,
		conditionAfter: input.outcome.conditionAfter,
		integrityBefore: input.outcome.integrityBefore,
		integrityAfter: input.outcome.integrityAfter,
		sourceType: 'repair_action',
		sourceId: row!.id,
		extraPayload: { thumper_run_id: input.thumperRunId ?? null }
	});

	return row!;
}

export type RecordThumperResponseInput = {
	pilotId: string;
	thumperRunId: string;
	windowIndex: number;
	complication: string;
	matchingAction: string;
	severity: string;
	chosenResponse: string;
	pilotFrameId: string;
	currentMeters: EventWindowMeterSnapshot;
	totalWindowCount: number;
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

		const windowOutcome = resolveEventWindowOutcome({
			complication: input.complication as ThumperComplicationId,
			matchingAction: input.matchingAction as ThumperEventActionId,
			severity: parseEventWindowSeverity(input.severity),
			chosenResponse: input.chosenResponse as ThumperWindowChosenResponse,
			currentMeters: input.currentMeters,
			windowIndex: input.windowIndex,
			totalWindowCount: input.totalWindowCount
		});

		const recorded = await recordThumperEventWindowResponse(tx, {
			thumperRunId: input.thumperRunId,
			windowIndex: input.windowIndex,
			chosenResponse: input.chosenResponse,
			beforeState: windowOutcome.beforeState,
			afterState: windowOutcome.afterState
		});

		if (!recorded) {
			return { status: 'not_recorded' };
		}

		if (input.chosenResponse === 'field_repair') {
			const hullItem = await getRunHullItemForRepair(tx, input.thumperRunId);
			if (!hullItem) {
				throw new Error('Run hull part snapshot missing for field repair');
			}

			const kit = await getOldestFieldRepairKitForPilot(tx, input.pilotId);
			if (!kit) {
				throw new FieldRepairKitUnavailableError();
			}

			const kitScores = kitScoresFromItem(kit.propertyScores);
			const before = {
				condition: hullItem.condition,
				integrity: hullItem.integrity
			};
			const outcome =
				input.complication === 'hull_damage'
					? applyHullDamageFieldRepair(before, kitScores)
					: applyFieldRepairWithKit(before, kitScores);

			const consumed = await consumeRepairKit(tx, kit.id);
			if (!consumed) {
				throw new FieldRepairKitUnavailableError();
			}

			await tx
				.update(items)
				.set({
					condition: outcome.conditionAfter,
					integrity: outcome.integrityAfter
				})
				.where(eq(items.id, hullItem.id));

			await updateRunHullDurability(tx, input.thumperRunId, outcome);
			await insertRepairActionAudit(tx, {
				pilotId: input.pilotId,
				repairKitItemId: kit.id,
				targetItemId: hullItem.id,
				thumperRunId: input.thumperRunId,
				thumperEventWindowIndex: input.windowIndex,
				context: 'field_repair_during_run',
				outcome,
				kitConditionRestoredScore: kitScores.conditionRestored,
				kitIntegritySafetyScore: kitScores.integritySafety
			});
		} else if (input.complication === 'hull_damage' && input.chosenResponse === 'hold') {
			const hullItem = await getRunHullItemForRepair(tx, input.thumperRunId);
			if (!hullItem) {
				throw new Error('Run hull part snapshot missing for hull damage');
			}

			const beforeHold = {
				condition: hullItem.condition,
				integrity: hullItem.integrity
			};
			const afterHold = applyHullDamageWithoutFieldRepair(beforeHold);

			await tx
				.update(items)
				.set({
					condition: afterHold.condition,
					integrity: afterHold.integrity
				})
				.where(eq(items.id, hullItem.id));

			await appendItemConditionChangedLedger(tx, {
				pilotId: input.pilotId,
				targetItemId: hullItem.id,
				conditionBefore: beforeHold.condition,
				conditionAfter: afterHold.condition,
				integrityBefore: beforeHold.integrity,
				integrityAfter: afterHold.integrity,
				sourceType: 'thumper_event_response',
				sourceId: input.thumperRunId,
				extraPayload: {
					thumper_run_id: input.thumperRunId,
					thumper_event_window_index: input.windowIndex,
					context: 'hull_damage_hold',
					complication: input.complication,
					chosen_response: input.chosenResponse
				}
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

/** Workshop/field repair targeting a thumper part or scanner item. */
export async function applyRepairKitToItemForPilot(
	db: Db,
	input: { pilotId: string; targetItemId: string }
) {
	return db.transaction(async (tx) => {
		const kit = await getOldestFieldRepairKitForPilot(tx, input.pilotId);
		if (!kit) {
			return { status: 'no_repair_kit' as const };
		}

		const [target] = await tx.select().from(items).where(eq(items.id, input.targetItemId)).limit(1);
		if (!target || target.pilotId !== input.pilotId || target.consumedAt) {
			return { status: 'invalid_target' as const, reason: 'Repair target not found' };
		}
		if (!isRepairKitTargetSchematic(target.schematicId)) {
			return {
				status: 'invalid_target' as const,
				reason: 'Repair kits can only target thumper parts or survey scanners'
			};
		}

		const kitScores = kitScoresFromItem(kit.propertyScores);
		const outcome = applyFieldRepairWithKit(
			{ condition: target.condition, integrity: target.integrity },
			kitScores
		);

		const consumed = await consumeRepairKit(tx, kit.id);
		if (!consumed) {
			throw new FieldRepairKitUnavailableError();
		}

		const [updated] = await tx
			.update(items)
			.set({
				condition: outcome.conditionAfter,
				integrity: outcome.integrityAfter
			})
			.where(eq(items.id, target.id))
			.returning();

		await insertRepairActionAudit(tx, {
			pilotId: input.pilotId,
			repairKitItemId: kit.id,
			targetItemId: target.id,
			context: 'workshop_repair',
			outcome,
			kitConditionRestoredScore: kitScores.conditionRestored,
			kitIntegritySafetyScore: kitScores.integritySafety
		});

		return {
			status: 'repaired' as const,
			item: updated!,
			fieldRepairKitCount: await countFieldRepairKitsForPilot(tx, input.pilotId)
		};
	});
}

/** Convenience wrapper for crafting a Field Repair Kit. */
export function craftFieldRepairKitForPilot(db: Db, input: Omit<CraftSchematicInput, 'schematic'>) {
	return craftSchematicForPilot(db, { ...input, schematic: FIELD_REPAIR_KIT });
}
