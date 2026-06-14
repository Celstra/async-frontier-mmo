import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	generateDepositSpots,
	TUTORIAL_RUN_2_SEED,
	TUTORIAL_RUN_2_YIELD
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { depositSpotYields } from '../schema/depositSpotYields.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { repairActions } from '../schema/repairActions.js';
import { resourceInstances } from '../schema/resourceInstances.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { thumperEventWindows } from '../schema/thumperEventWindows.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { getBloomRecord } from './bloomRotation.js';
import { seedDepositSpotRemainingUnits } from './depositSpotYields.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';
import { resolveThumperRunForStoredWindows } from './thumperRunResolution.js';
import { claimOpenThumperRunForPilot, deployThumperRunWithEventWindows } from './thumperRunWorkflow.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('tutorial run 2 claim on exhausted locked spot', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `tutorial-run2-exhausted-${Date.now()}`;

	let kethInstanceId = '';
	let kethSlug = '';
	let kethSpotId = '';
	let bloomGenerationSeed = '';

	const tutorialWindows = [
		{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' },
		{ windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
	] as const;

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId, { autoEquip: true });

		const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
		expect(keth).not.toBeNull();
		kethInstanceId = keth!.id;
		kethSlug = keth!.resourceSlug;

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		bloomGenerationSeed = bloom!.generationSeed;
		kethSpotId = generateDepositSpots({
			resourceSlug: 'keth_iron',
			bloomGenerationSeed,
			concentrationMinPercent: keth!.concentrationMinPercent,
			concentrationMaxPercent: keth!.concentrationMaxPercent,
			prospectingCycle: keth!.prospectingCycle
		})[0]!.spotId;
	});

	afterAll(async () => {
		const pilotRuns = await db
			.select({ id: thumperRuns.id })
			.from(thumperRuns)
			.where(eq(thumperRuns.pilotId, testPilotId));
		const runIds = pilotRuns.map((run) => run.id);

		await db.delete(repairActions).where(eq(repairActions.pilotId, testPilotId));
		if (runIds.length > 0) {
			await db.delete(thumperRunResults).where(inArray(thumperRunResults.thumperRunId, runIds));
			await db.delete(thumperEventWindows).where(inArray(thumperEventWindows.thumperRunId, runIds));
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
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, kethSpotId));
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(items).where(eq(items.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('pays scripted TUTORIAL_RUN_2_YIELD when the shared Keth spot is already exhausted', async () => {
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, kethSpotId));
		await seedDepositSpotRemainingUnits(db, {
			spotId: kethSpotId,
			resourceInstanceId: kethInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 0
		});

		const deployedAt = new Date(Date.now() - 400_000);
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			targetResourceId: kethSlug,
			runSeed: TUTORIAL_RUN_2_SEED,
			isPushRun: false,
			deployedAt,
			durationSeconds: 300,
			depositSpotId: kethSpotId,
			trueConcentrationPercent: 67,
			extractionTailMinutes: 5,
			resourceInstanceId: kethInstanceId,
			allowExhaustedSpot: true,
			windows: [...tutorialWindows]
		});

		for (const window of tutorialWindows) {
			await recordThumperEventWindowResponse(db, {
				thumperRunId: run.id,
				windowIndex: window.windowIndex,
				chosenResponse: window.matchingAction
			});
		}

		const stackBefore = await getResourceStackForPilotInstance(db, testPilotId, kethInstanceId);
		const quantityBefore = stackBefore?.quantity ?? 0;

		const claim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date(),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => {},
			buildResult: (tx, runRow, windows) =>
				resolveThumperRunForStoredWindows(tx, runRow, windows),
			grantResourceReward: true
		});

		expect(claim.status).toBe('claimed');
		if (claim.status !== 'claimed' || !claim.claimResult) {
			throw new Error('expected tutorial run 2 claim');
		}

		expect(claim.claimResult.recoveredQuantity).toBe(TUTORIAL_RUN_2_YIELD);

		const stackAfter = await getResourceStackForPilotInstance(db, testPilotId, kethInstanceId);
		expect((stackAfter?.quantity ?? 0) - quantityBefore).toBe(TUTORIAL_RUN_2_YIELD);
	});
});
