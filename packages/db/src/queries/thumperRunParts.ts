import {
	applyWearToRunParts,
	computeRunPartWearDeltas,
	computeThumperPartRunModifiers,
	deriveAppliedWearDeltas,
	totalAppliedWearFromDeltas,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperPartSlot,
	type ThumperPartSnapshot,
	type ThumperPartWearDelta,
	type ThumperWindowChosenResponse
} from '@async-frontier-mmo/domain';
import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { appendItemConditionChangedLedger } from './economyLedger.js';
import { items } from '../schema/items.js';
import { thumperRunPartSnapshots } from '../schema/thumperRunPartSnapshots.js';
import { getEquippedThumperPartsForPilot, itemToPartSnapshot } from './thumperPartEquipment.js';
import { getThumperEventWindowsForRun } from './thumperEventWindows.js';

export async function snapshotEquippedPartsForRun(
	db: DbExecutor,
	input: { thumperRunId: string; pilotId: string }
): Promise<ThumperPartSnapshot[]> {
	const equipped = await getEquippedThumperPartsForPilot(db, input.pilotId);
	const snapshots: ThumperPartSnapshot[] = [];

	for (const slot of ['drill', 'pump', 'hull'] as const) {
		const item = equipped[slot];
		if (!item) {
			throw new Error(`Pilot must equip a ${slot} part before deploy`);
		}

		const snapshot = itemToPartSnapshot(item, slot);
		snapshots.push(snapshot);

		await db.insert(thumperRunPartSnapshots).values({
			thumperRunId: input.thumperRunId,
			slot,
			itemId: item.id,
			schematicId: item.schematicId,
			displayName: item.displayName,
			propertyScores: item.propertyScores,
			conditionAtDeploy: item.condition,
			integrityAtDeploy: item.integrity
		});
	}

	return snapshots;
}

export async function getThumperRunPartSnapshots(
	db: DbExecutor,
	thumperRunId: string
): Promise<ThumperPartSnapshot[]> {
	const rows = await db
		.select()
		.from(thumperRunPartSnapshots)
		.where(eq(thumperRunPartSnapshots.thumperRunId, thumperRunId));

	return rows.map((row) => ({
		slot: row.slot as ThumperPartSnapshot['slot'],
		itemId: row.itemId,
		schematicId: row.schematicId,
		displayName: row.displayName,
		propertyScores: row.propertyScores,
		condition: row.conditionAtDeploy,
		integrity: row.integrityAtDeploy
	}));
}

export function partModifiersFromRunSnapshots(snapshots: ThumperPartSnapshot[]) {
	return computeThumperPartRunModifiers(snapshots);
}

export async function getRunHullItemForRepair(db: DbExecutor, thumperRunId: string) {
	const [row] = await db
		.select()
		.from(thumperRunPartSnapshots)
		.where(
			and(
				eq(thumperRunPartSnapshots.thumperRunId, thumperRunId),
				eq(thumperRunPartSnapshots.slot, 'hull')
			)
		)
		.limit(1);

	if (!row) {
		return null;
	}

	const [item] = await db.select().from(items).where(eq(items.id, row.itemId)).limit(1);
	return item ?? null;
}

export async function applyRunWearToPartItems(
	db: DbExecutor,
	input: {
		pilotId: string;
		thumperRunId: string;
		snapshots: ThumperPartSnapshot[];
		responses: Array<{ windowIndex: number; complication: string; chosenResponse: string }>;
		isPushRun: boolean;
	}
): Promise<{
	afterWear: ThumperPartSnapshot[];
	wearDeltas: Record<ThumperPartSlot, ThumperPartWearDelta>;
	appliedWear: number;
}> {
	const storedWindows = await getThumperEventWindowsForRun(db, input.thumperRunId);
	const matchingActionByWindow = new Map(
		storedWindows.map((window) => [window.windowIndex, window.matchingAction])
	);

	const requestedWearDeltas = computeRunPartWearDeltas(
		input.responses.map((response) => {
			const matchingAction = matchingActionByWindow.get(response.windowIndex);
			if (!matchingAction) {
				throw new Error(`No stored window for index ${response.windowIndex}`);
			}

			return {
				windowIndex: response.windowIndex,
				complication: response.complication as ThumperComplicationId,
				chosenResponse: response.chosenResponse as ThumperWindowChosenResponse,
				matchingAction: matchingAction as ThumperEventActionId
			};
		}),
		{ isPushRun: input.isPushRun }
	);

	// Wear applies on current item rows — mid-run field repair / hull damage must survive claim.
	const currentSnapshots: ThumperPartSnapshot[] = [];
	for (const snapshot of input.snapshots) {
		const [item] = await db.select().from(items).where(eq(items.id, snapshot.itemId)).limit(1);
		if (!item) {
			throw new Error(`Snapshotted thumper part item missing: ${snapshot.itemId}`);
		}

		currentSnapshots.push({
			...snapshot,
			condition: item.condition,
			integrity: item.integrity
		});
	}

	const afterWear = applyWearToRunParts(currentSnapshots, requestedWearDeltas);
	const appliedWearDeltas = deriveAppliedWearDeltas(currentSnapshots, afterWear);

	for (const part of afterWear) {
		const before = currentSnapshots.find((snapshot) => snapshot.itemId === part.itemId);
		if (!before) {
			continue;
		}

		if (before.condition === part.condition && before.integrity === part.integrity) {
			continue;
		}

		await db
			.update(items)
			.set({
				condition: part.condition,
				integrity: part.integrity
			})
			.where(eq(items.id, part.itemId));

		await appendItemConditionChangedLedger(db, {
			pilotId: input.pilotId,
			targetItemId: part.itemId,
			conditionBefore: before.condition,
			conditionAfter: part.condition,
			integrityBefore: before.integrity,
			integrityAfter: part.integrity,
			sourceType: 'thumper_run_claim',
			sourceId: input.thumperRunId,
			extraPayload: {
				thumper_run_id: input.thumperRunId,
				slot: part.slot,
				context: 'run_wear_on_claim'
			}
		});
	}

	return {
		afterWear,
		wearDeltas: appliedWearDeltas,
		appliedWear: totalAppliedWearFromDeltas(appliedWearDeltas)
	};
}

export async function applyDefenseWearToPartItems(
	db: DbExecutor,
	input: {
		pilotId: string;
		thumperRunId: string;
		snapshots: ThumperPartSnapshot[];
		endingCondition: Record<'drill' | 'pump' | 'hull', number>;
	}
): Promise<{
	afterWear: ThumperPartSnapshot[];
	wearDeltas: Record<ThumperPartSlot, ThumperPartWearDelta>;
	appliedWear: number;
}> {
	const currentSnapshots: ThumperPartSnapshot[] = [];
	for (const snapshot of input.snapshots) {
		const [item] = await db.select().from(items).where(eq(items.id, snapshot.itemId)).limit(1);
		if (!item) {
			throw new Error(`Snapshotted thumper part item missing: ${snapshot.itemId}`);
		}
		currentSnapshots.push({
			...snapshot,
			condition: item.condition,
			integrity: item.integrity
		});
	}

	const afterWear = currentSnapshots.map((part) => ({
		...part,
		condition: Math.round(input.endingCondition[part.slot])
	}));
	const appliedWearDeltas = deriveAppliedWearDeltas(currentSnapshots, afterWear);

	for (const part of afterWear) {
		const before = currentSnapshots.find((snapshot) => snapshot.itemId === part.itemId);
		if (!before || before.condition === part.condition) {
			continue;
		}

		await db
			.update(items)
			.set({ condition: part.condition })
			.where(eq(items.id, part.itemId));

		await appendItemConditionChangedLedger(db, {
			pilotId: input.pilotId,
			targetItemId: part.itemId,
			conditionBefore: before.condition,
			conditionAfter: part.condition,
			integrityBefore: before.integrity,
			integrityAfter: part.integrity,
			sourceType: 'thumper_run_claim',
			sourceId: input.thumperRunId,
			extraPayload: {
				thumper_run_id: input.thumperRunId,
				slot: part.slot,
				context: 'defense_run_wear_on_claim'
			}
		});
	}

	return {
		afterWear,
		wearDeltas: appliedWearDeltas,
		appliedWear: totalAppliedWearFromDeltas(appliedWearDeltas)
	};
}
