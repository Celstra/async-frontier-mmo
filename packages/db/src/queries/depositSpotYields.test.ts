import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { generateDepositSpots, generateSeededThumperEventWindows } from '@async-frontier-mmo/domain';
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
import {
	clearPilotProspectingState,
	sampleSpotForPilot,
	scanFamilyForPilot
} from './prospecting.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';
import { resolveThumperRunForStoredWindows } from './thumperRunResolution.js';
import {
	claimOpenThumperRunForPilot,
	deployThumperRunWithEventWindows,
	DepositSpotExhaustedError
} from './thumperRunWorkflow.js';
import {
	formatDepositSpotDrainAdjustment,
	getDepositSpotYieldState,
	parseDepositSpotDrainAdjustment,
	seedDepositSpotRemainingUnits
} from './depositSpotYields.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('deposit spot yield depletion', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `deposit-spot-drain-${Date.now()}`;

	let veyrithInstanceId = '';
	let veyrithSlug = '';
	let spotId = '';
	let bloomGenerationSeed = '';
	let originalProspectingCycle = 1;

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId);

		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(veyrith).not.toBeNull();
		veyrithInstanceId = veyrith!.id;
		veyrithSlug = veyrith!.resourceSlug;
		originalProspectingCycle = veyrith!.prospectingCycle;

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		bloomGenerationSeed = bloom!.generationSeed;
		const spots = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed,
			concentrationMinPercent: veyrith!.concentrationMinPercent,
			concentrationMaxPercent: veyrith!.concentrationMaxPercent
		});
		spotId = spots[0]!.spotId;
	});

	afterAll(async () => {
		await db
			.update(resourceInstances)
			.set({ prospectingCycle: originalProspectingCycle })
			.where(eq(resourceInstances.id, veyrithInstanceId));

		await clearPilotProspectingState(db, testPilotId);
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, spotId));

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
		await db.delete(items).where(eq(items.pilotId, testPilotId));
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	async function resetVeyrithCycle() {
		await db
			.update(resourceInstances)
			.set({ prospectingCycle: 1 })
			.where(eq(resourceInstances.id, veyrithInstanceId));
	}

	async function clearPilotRuns() {
		const pilotRuns = await db
			.select({ id: thumperRuns.id })
			.from(thumperRuns)
			.where(eq(thumperRuns.pilotId, testPilotId));
		const runIds = pilotRuns.map((run) => run.id);
		if (runIds.length === 0) {
			return;
		}
		await db.delete(thumperRunResults).where(inArray(thumperRunResults.thumperRunId, runIds));
		await db.delete(thumperEventWindows).where(inArray(thumperEventWindows.thumperRunId, runIds));
		await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, testPilotId));
	}

	async function sampleSpot() {
		const scan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		expect(scan.status).toBe('ok');

		const sample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId,
			bloomId: BLOOM_ONE_ID
		});
		expect(sample.status).toBe('ok');
		if (sample.status !== 'ok') {
			throw new Error('sample failed');
		}
		return sample;
	}

	async function deployAndResolveRun(input: {
		runSeed: string;
		windows: Array<{ windowIndex: number; complication: string; matchingAction: string }>;
		trueConcentrationPercent: number;
		depositSpotId?: string;
	}) {
		const deployedAt = new Date(Date.now() - 120_000);
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			targetResourceId: veyrithSlug,
			runSeed: input.runSeed,
			isPushRun: false,
			deployedAt,
			durationSeconds: 60,
			depositSpotId: input.depositSpotId ?? spotId,
			trueConcentrationPercent: input.trueConcentrationPercent,
			extractionTailMinutes: 60,
			resourceInstanceId: veyrithInstanceId,
			windows: input.windows
		});

		for (const window of input.windows) {
			await recordThumperEventWindowResponse(db, {
				thumperRunId: run.id,
				windowIndex: window.windowIndex,
				chosenResponse: window.matchingAction
			});
		}

		return run;
	}

	it('rejects deploy on an exhausted spot', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, spotId));
		await sampleSpot();
		await seedDepositSpotRemainingUnits(db, {
			spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 0
		});

		await expect(
			deployThumperRunWithEventWindows(db, {
				pilotId: testPilotId,
				targetResourceId: veyrithSlug,
				runSeed: `exhausted-deploy-${Date.now()}`,
				isPushRun: false,
				deployedAt: new Date(),
				durationSeconds: 60,
				depositSpotId: spotId,
				trueConcentrationPercent: 60,
				extractionTailMinutes: 60,
				resourceInstanceId: veyrithInstanceId,
				windows: []
			})
		).rejects.toBeInstanceOf(DepositSpotExhaustedError);
	});

	it('caps claim payout to remaining units and exhausts the spot', async () => {
		await clearPilotRuns();
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, spotId));
		const sample = await sampleSpot();

		await seedDepositSpotRemainingUnits(db, {
			spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 10
		});

		const runSeed = `deposit-cap-claim-${Date.now()}`;
		const plan = generateSeededThumperEventWindows({
			runSeed,
			targetResourceId: 'veyrith_copper',
			isPushRun: false
		});
		// Filter quiet windows for DB persistence
		const eventWindows = plan.windows
			.filter((w) => !w.quiet)
			.map((w) => ({
				windowIndex: w.windowIndex,
				complication: 'complication' in w ? w.complication : 'signal_drift',
				matchingAction: 'matchingAction' in w ? w.matchingAction : 'signal_tune'
			}));
		await deployAndResolveRun({
			runSeed: plan.runSeed,
			windows: eventWindows,
			trueConcentrationPercent: sample.trueConcentrationPercent
		});

		const stackBefore = await getResourceStackForPilotInstance(db, testPilotId, veyrithInstanceId);
		const quantityBefore = stackBefore?.quantity ?? 0;

		const claim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date(),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => undefined,
			buildResult: (tx, runRow, windows) => resolveThumperRunForStoredWindows(tx, runRow, windows),
			grantResourceReward: true
		});

		expect(claim.status).toBe('claimed');
		if (claim.status !== 'claimed' || !claim.claimResult) {
			throw new Error('expected claim');
		}

		expect(claim.claimResult.recoveredQuantity).toBe(10);
		expect(claim.reward?.quantityGranted).toBe(10);
		expect(claim.claimResult.recoveredQuantity).toBeLessThan(30);

		const adjustment = parseDepositSpotDrainAdjustment(claim.claimResult.explanation);
		expect(adjustment).toBe(formatDepositSpotDrainAdjustment(10));

		const spotAfter = await getDepositSpotYieldState(db, {
			spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed
		});
		expect(spotAfter.remainingUnits).toBe(0);
		expect(spotAfter.exhaustedAt).not.toBeNull();

		const stackAfter = await getResourceStackForPilotInstance(db, testPilotId, veyrithInstanceId);
		expect(stackAfter!.quantity).toBe(quantityBefore + 10);
	});

	it('reflects thinning yield band after partial extraction', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, spotId));
		await sampleSpot();

		const fresh = await getDepositSpotYieldState(db, {
			spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed
		});
		const targetRemaining = Math.max(1, Math.floor(fresh.capacityUnits * 0.4));
		await seedDepositSpotRemainingUnits(db, {
			spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: targetRemaining
		});

		const scan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		expect(scan.status).toBe('ok');
		if (scan.status !== 'ok') {
			throw new Error('scan failed');
		}

		const veyrith = scan.resources.find((resource) => resource.resourceSlug === veyrithSlug);
		const spot = veyrith?.spots.find((candidate) => candidate.spotId === spotId);
		expect(spot?.yieldBand).toBe('thinning');
		expect(spot?.yieldBandLabel).toBe('Thinning');
	});

	it('grants reduced amount on a second claim after rolling to a new cycle spot', async () => {
		await clearPilotRuns();
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, spotId));
		const sample = await sampleSpot();

		await seedDepositSpotRemainingUnits(db, {
			spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 100
		});

		const plan = generateSeededThumperEventWindows({
			runSeed: `first-partial-drain-${Date.now()}`,
			targetResourceId: 'veyrith_copper',
			isPushRun: false
		});
		// Filter quiet windows for DB persistence
		const eventWindows = plan.windows
			.filter((w) => !w.quiet)
			.map((w) => ({
				windowIndex: w.windowIndex,
				complication: 'complication' in w ? w.complication : 'signal_drift',
				matchingAction: 'matchingAction' in w ? w.matchingAction : 'signal_tune'
			}));

		await deployAndResolveRun({
			runSeed: plan.runSeed,
			windows: eventWindows,
			trueConcentrationPercent: sample.trueConcentrationPercent
		});

		const firstClaim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date(),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => undefined,
			buildResult: (tx, runRow, windows) => resolveThumperRunForStoredWindows(tx, runRow, windows),
			grantResourceReward: true
		});
		expect(firstClaim.status).toBe('claimed');
		if (firstClaim.status !== 'claimed' || !firstClaim.claimResult) {
			throw new Error('expected first claim');
		}
		expect(firstClaim.claimResult.recoveredQuantity).toBeGreaterThan(0);

		const cycleTwoSpotId = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed,
			concentrationMinPercent: 30,
			concentrationMaxPercent: 67,
			prospectingCycle: 2
		})[0]!.spotId;

		await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const secondSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: cycleTwoSpotId,
			bloomId: BLOOM_ONE_ID
		});
		expect(secondSample.status).toBe('ok');
		if (secondSample.status !== 'ok') {
			throw new Error('expected second sample');
		}

		await seedDepositSpotRemainingUnits(db, {
			spotId: cycleTwoSpotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 40
		});

		// Generate a fresh plan for second run and filter quiet windows
		const secondPlan = generateSeededThumperEventWindows({
			runSeed: `second-partial-drain-${Date.now()}`,
			targetResourceId: 'veyrith_copper',
			isPushRun: false
		});
		const secondEventWindows = secondPlan.windows
			.filter((w) => !w.quiet)
			.map((w) => ({
				windowIndex: w.windowIndex,
				complication: 'complication' in w ? w.complication : 'signal_drift',
				matchingAction: 'matchingAction' in w ? w.matchingAction : 'signal_tune'
			}));

		await deployAndResolveRun({
			runSeed: secondPlan.runSeed,
			windows: secondEventWindows,
			trueConcentrationPercent: secondSample.trueConcentrationPercent,
			depositSpotId: cycleTwoSpotId
		});

		const secondClaim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date(),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => undefined,
			buildResult: (tx, runRow, windows) => resolveThumperRunForStoredWindows(tx, runRow, windows),
			grantResourceReward: true
		});

		expect(secondClaim.status).toBe('claimed');
		if (secondClaim.status !== 'claimed' || !secondClaim.claimResult) {
			throw new Error('expected second claim');
		}
		expect(secondClaim.claimResult.recoveredQuantity).toBeLessThanOrEqual(40);
		expect(secondClaim.claimResult.recoveredQuantity).toBeGreaterThan(0);
	});
});
