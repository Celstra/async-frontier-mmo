import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { MATCHING_ACTION_WEAR_CONDITION } from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { thumperEventWindows } from '../schema/thumperEventWindows.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';
import { ensureStarterThumperPartsForPilot, getEquippedThumperPartsForPilot } from './thumperPartEquipment.js';
import { applyRunWearToPartItems, getThumperRunPartSnapshots } from './thumperRunParts.js';
import { deployThumperRunWithEventWindows } from './thumperRunWorkflow.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('applyRunWearToPartItems', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `run-wear-${Date.now()}`;

	beforeAll(async () => {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId, { autoEquip: true });
	});

	afterAll(async () => {
		const pilotRuns = await db
			.select({ id: thumperRuns.id })
			.from(thumperRuns)
			.where(eq(thumperRuns.pilotId, testPilotId));
		const runIds = pilotRuns.map((run) => run.id);

		if (runIds.length > 0) {
			await db
				.delete(thumperEventWindows)
				.where(inArray(thumperEventWindows.thumperRunId, runIds));
			await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, testPilotId));
		}

		await db
			.update(pilots)
			.set({
				equippedScannerItemId: null,
				equippedDrillItemId: null,
				equippedPumpItemId: null,
				equippedHullItemId: null
			})
			.where(eq(pilots.id, testPilotId));
		await db.delete(items).where(eq(items.pilotId, testPilotId));
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('applies matching-action wear to the correct equipped part at claim', async () => {
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			targetResourceId: 'veyrith_copper',
			runSeed: `wear-claim-${Date.now()}`,
			isPushRun: false,
			deployedAt: new Date(Date.now() - 120_000),
			durationSeconds: 60,
			windows: [
				{
					windowIndex: 1,
					complication: 'pump_strain',
					matchingAction: 'clear_pump_problem',
					severity: 'minor'
				}
			]
		});

		const equippedBefore = await getEquippedThumperPartsForPilot(db, testPilotId);
		const pumpBefore = equippedBefore.pump!;

		await recordThumperEventWindowResponse(db, {
			thumperRunId: run.id,
			windowIndex: 1,
			chosenResponse: 'clear_pump_problem'
		});

		const snapshots = await getThumperRunPartSnapshots(db, run.id);
		const responses = [
			{
				windowIndex: 1,
				complication: 'pump_strain',
				chosenResponse: 'clear_pump_problem'
			}
		];

		await applyRunWearToPartItems(db, {
			pilotId: testPilotId,
			thumperRunId: run.id,
			snapshots,
			responses,
			isPushRun: false
		});

		const equippedAfter = await getEquippedThumperPartsForPilot(db, testPilotId);
		expect(equippedAfter.pump!.condition).toBeLessThanOrEqual(
			pumpBefore.condition - MATCHING_ACTION_WEAR_CONDITION
		);
		expect(equippedAfter.drill!.condition).toBeLessThan(equippedBefore.drill!.condition);
	});
});
