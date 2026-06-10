import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	assertVeyrithTutorialWindowsReady,
	resolveFirstSessionThumperRunResult,
	type ThumperEventActionId
} from '@async-frontier-mmo/domain';
import { parseFrameId } from 'shared';
import { createDb } from '../client.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { repairActions } from '../schema/repairActions.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { thumperEventWindows } from '../schema/thumperEventWindows.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { economyLedger } from '../schema/economyLedger.js';
import { listEconomyLedgerEntriesForPilot } from './economyLedger.js';
import { ensureDemoPilot } from './pilots.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';
import { getThumperRunPartSnapshots, partModifiersFromRunSnapshots } from './thumperRunParts.js';
import {
	ensureBloomOneResourceInstances,
	getResourceInstanceByBloomSlug
} from './resourceInstances.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';
import {
	claimOpenThumperRunForPilot,
	deployThumperRunWithEventWindows
} from './thumperRunWorkflow.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

function ledgerGrantsForResult(
	entries: Awaited<ReturnType<typeof listEconomyLedgerEntriesForPilot>>,
	resultId: string
) {
	return entries.filter(
		(entry) =>
			entry.eventType === 'resource_granted' &&
			entry.payload !== null &&
			typeof entry.payload === 'object' &&
			'source_type' in entry.payload &&
			entry.payload.source_type === 'thumper_run_result' &&
			'source_id' in entry.payload &&
			entry.payload.source_id === resultId
	);
}

describeDb('transactional claim reward', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-14-claim-${Date.now()}`;

	beforeAll(async () => {
		await ensureDemoPilot(db);
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId, frameId: 'recon' }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId);
	});

	afterAll(async () => {
		const pilotRuns = await db
			.select({ id: thumperRuns.id })
			.from(thumperRuns)
			.where(eq(thumperRuns.pilotId, testPilotId));
		const runIds = pilotRuns.map((run) => run.id);

		await db.delete(repairActions).where(eq(repairActions.pilotId, testPilotId));

		if (runIds.length > 0) {
			await db
				.delete(thumperRunResults)
				.where(inArray(thumperRunResults.thumperRunId, runIds));
			await db
				.delete(thumperEventWindows)
				.where(inArray(thumperEventWindows.thumperRunId, runIds));
			// Cascades thumper_run_part_snapshots (item_id FK blocks deleting items first).
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
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('grants Veyrith Copper once and rejects duplicate claim rewards', async () => {
		const veyrithInstance = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(veyrithInstance).not.toBeNull();

		const stackBefore = await getResourceStackForPilotInstance(
			db,
			testPilotId,
			veyrithInstance!.id
		);
		const quantityBefore = stackBefore?.quantity ?? 0;

		const deployedAt = new Date(Date.now() - 120_000);
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			pilotFrameId: 'recon',
			targetResourceId: 'veyrith_copper',
			runSeed: 'first-session-scripted',
			isPushRun: false,
			deployedAt,
			durationSeconds: 60,
			windows: [
				{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
			]
		});

		await recordThumperEventWindowResponse(db, {
			thumperRunId: run.id,
			windowIndex: 1,
			chosenResponse: 'signal_tune'
		});
		await recordThumperEventWindowResponse(db, {
			thumperRunId: run.id,
			windowIndex: 2,
			chosenResponse: 'clear_pump_problem'
		});

		const claimNow = new Date();
		const firstClaim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: claimNow,
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: (_run, windows) => assertVeyrithTutorialWindowsReady(windows),
			buildResult: async (tx, runRow, windows) => {
				const snapshots = await getThumperRunPartSnapshots(tx, runRow.id);
				return resolveFirstSessionThumperRunResult({
					targetResourceId: 'veyrith_copper',
					pilotFrame: parseFrameId(runRow.pilotFrameId),
					partModifiers: partModifiersFromRunSnapshots(snapshots),
					eventWindows: windows.map((window) => ({
						windowIndex: window.windowIndex,
						complication: window.complication as 'signal_drift' | 'pump_strain',
						matchingAction: window.matchingAction as ThumperEventActionId
					})),
					responses: windows
						.filter((window) => window.chosenResponse !== null)
						.map((window) => ({
							windowIndex: window.windowIndex,
							complication: window.complication as 'signal_drift' | 'pump_strain',
							chosenResponse: window.chosenResponse as 'signal_tune' | 'clear_pump_problem'
						}))
				});
			},
			grantResourceReward: { bloomId: BLOOM_ONE_ID }
		});

		if (firstClaim.status !== 'claimed' || !firstClaim.claimResult) {
			throw new Error('expected first claim to succeed');
		}

		expect(firstClaim.reward?.resourceInstanceId).toBe(veyrithInstance!.id);
		expect(firstClaim.reward?.quantityGranted).toBe(firstClaim.claimResult.recoveredQuantity);

		const stackAfterFirst = await getResourceStackForPilotInstance(
			db,
			testPilotId,
			veyrithInstance!.id
		);
		expect(stackAfterFirst!.quantity).toBe(
			quantityBefore + firstClaim.claimResult.recoveredQuantity
		);

		const pilotLedger = await listEconomyLedgerEntriesForPilot(db, testPilotId);
		const grantsForResult = ledgerGrantsForResult(pilotLedger, firstClaim.claimResult.id);
		expect(grantsForResult).toHaveLength(1);
		expect(grantsForResult[0]!.resourceInstanceId).toBe(veyrithInstance!.id);

		const secondClaim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: claimNow,
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: (_run, windows) => assertVeyrithTutorialWindowsReady(windows),
			buildResult: async (tx, runRow, windows) => {
				const snapshots = await getThumperRunPartSnapshots(tx, runRow.id);
				return resolveFirstSessionThumperRunResult({
					targetResourceId: 'veyrith_copper',
					pilotFrame: parseFrameId(runRow.pilotFrameId),
					partModifiers: partModifiersFromRunSnapshots(snapshots),
					eventWindows: windows.map((window) => ({
						windowIndex: window.windowIndex,
						complication: window.complication as 'signal_drift' | 'pump_strain',
						matchingAction: window.matchingAction as ThumperEventActionId
					})),
					responses: windows
						.filter((window) => window.chosenResponse !== null)
						.map((window) => ({
							windowIndex: window.windowIndex,
							complication: window.complication as 'signal_drift' | 'pump_strain',
							chosenResponse: window.chosenResponse as 'signal_tune' | 'clear_pump_problem'
						}))
				});
			},
			grantResourceReward: { bloomId: BLOOM_ONE_ID }
		});

		if (secondClaim.status !== 'already_claimed') {
			throw new Error('expected second claim to be already_claimed');
		}
		expect(secondClaim.reward).toBeNull();

		const stackAfterSecond = await getResourceStackForPilotInstance(
			db,
			testPilotId,
			veyrithInstance!.id
		);
		expect(stackAfterSecond!.quantity).toBe(stackAfterFirst!.quantity);

		const ledgerAfterSecond = await listEconomyLedgerEntriesForPilot(db, testPilotId);
		expect(ledgerGrantsForResult(ledgerAfterSecond, firstClaim.claimResult.id)).toHaveLength(1);
	});
});
