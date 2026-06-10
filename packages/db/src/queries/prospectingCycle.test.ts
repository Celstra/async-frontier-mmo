import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	generateDepositSpots,
	generateSeededThumperEventWindows,
	PROSPECTING_CYCLE_SCATTER_LINE,
	type NamedResourceId
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { depositSpotYields } from '../schema/depositSpotYields.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilotFamilyScans } from '../schema/pilotFamilyScans.js';
import { pilotResourceStatReveals } from '../schema/pilotResourceStatReveals.js';
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
	hasPilotFamilyScan,
	previewFamilyScanForPilot,
	sampleSpotForPilot,
	scanFamilyForPilot
} from './prospecting.js';
import {
	ensureBloomOneResourceInstances,
	getResourceInstanceByBloomSlug,
	getResourceInstanceById
} from './resourceInstances.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { recordThumperEventWindowResponse } from './thumperEventWindows.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';
import { resolveThumperRunForStoredWindows } from './thumperRunResolution.js';
import {
	claimOpenThumperRunForPilot,
	deployThumperRunWithEventWindows,
	DepositSpotStaleError
} from './thumperRunWorkflow.js';
import { seedDepositSpotRemainingUnits } from './depositSpotYields.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('prospecting cycle after claim', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `prospecting-cycle-${Date.now()}`;

	let veyrithInstanceId = '';
	let veyrithSlug = '';
	let cycleOneSpotId = '';
	let bloomGenerationSeed = '';
	let originalProspectingCycle = 1;

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId, frameId: 'recon' }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId);

		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(veyrith).not.toBeNull();
		veyrithInstanceId = veyrith!.id;
		veyrithSlug = veyrith!.resourceSlug;
		originalProspectingCycle = veyrith!.prospectingCycle;

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		bloomGenerationSeed = bloom!.generationSeed;
		cycleOneSpotId = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed,
			concentrationMinPercent: veyrith!.concentrationMinPercent,
			concentrationMaxPercent: veyrith!.concentrationMaxPercent,
			prospectingCycle: 1
		})[0]!.spotId;
	});

	afterAll(async () => {
		await db
			.update(resourceInstances)
			.set({ prospectingCycle: originalProspectingCycle })
			.where(eq(resourceInstances.id, veyrithInstanceId));

		await clearPilotProspectingState(db, testPilotId);
		await db.delete(depositSpotYields).where(eq(depositSpotYields.resourceInstanceId, veyrithInstanceId));

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

	async function scanAndSample(spotId: string) {
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

	async function deployClaimAndReturnExplanation(spotId: string, trueConcentrationPercent: number) {
		const runSeed = `prospecting-cycle-${Date.now()}-${Math.random()}`;
		const plan = generateSeededThumperEventWindows({
			runSeed,
			targetResourceId: veyrithSlug as NamedResourceId,
			isPushRun: false
		});
		const deployedAt = new Date(Date.now() - 120_000);
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			pilotFrameId: 'recon',
			targetResourceId: veyrithSlug as NamedResourceId,
			runSeed: plan.runSeed,
			isPushRun: false,
			deployedAt,
			durationSeconds: 60,
			depositSpotId: spotId,
			trueConcentrationPercent,
			extractionTailMinutes: 60,
			resourceInstanceId: veyrithInstanceId,
			windows: plan.windows
		});

		for (const window of plan.windows) {
			await recordThumperEventWindowResponse(db, {
				thumperRunId: run.id,
				windowIndex: window.windowIndex,
				chosenResponse: window.matchingAction
			});
		}

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

		return claim.claimResult.explanation;
	}

	it('claim increments cycle, deletes family scan, and keeps stat reveals', async () => {
		await clearPilotRuns();
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.resourceInstanceId, veyrithInstanceId));

		const sample = await scanAndSample(cycleOneSpotId);
		await seedDepositSpotRemainingUnits(db, {
			spotId: cycleOneSpotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 200
		});

		const explanation = await deployClaimAndReturnExplanation(
			cycleOneSpotId,
			sample.trueConcentrationPercent
		);
		expect(explanation).toContain(PROSPECTING_CYCLE_SCATTER_LINE);

		const instance = await getResourceInstanceById(db, veyrithInstanceId);
		expect(instance?.prospectingCycle).toBe(2);

		expect(
			await hasPilotFamilyScan(db, {
				pilotId: testPilotId,
				bloomId: BLOOM_ONE_ID,
				family: 'conductive_metal'
			})
		).toBe(false);

		const [reveal] = await db
			.select()
			.from(pilotResourceStatReveals)
			.where(eq(pilotResourceStatReveals.pilotId, testPilotId));
		expect(reveal).toBeDefined();
	});

	it('rejects sampling and deploying stale cycle spot ids', async () => {
		await clearPilotRuns();
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.resourceInstanceId, veyrithInstanceId));

		const sample = await scanAndSample(cycleOneSpotId);
		await seedDepositSpotRemainingUnits(db, {
			spotId: cycleOneSpotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 200
		});
		await deployClaimAndReturnExplanation(cycleOneSpotId, sample.trueConcentrationPercent);

		const rescan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		expect(rescan.status).toBe('ok');

		const staleSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: cycleOneSpotId,
			bloomId: BLOOM_ONE_ID
		});
		expect(staleSample.status).toBe('spot_not_found');

		await expect(
			deployThumperRunWithEventWindows(db, {
				pilotId: testPilotId,
				pilotFrameId: 'recon',
				targetResourceId: veyrithSlug as NamedResourceId,
				runSeed: `stale-deploy-${Date.now()}`,
				isPushRun: false,
				deployedAt: new Date(),
				durationSeconds: 60,
				depositSpotId: cycleOneSpotId,
				trueConcentrationPercent: sample.trueConcentrationPercent,
				extractionTailMinutes: 60,
				resourceInstanceId: veyrithInstanceId,
				windows: []
			})
		).rejects.toBeInstanceOf(DepositSpotStaleError);
	});

	it('scan → sample → deploy → claim → rescan yields different spots', async () => {
		await clearPilotRuns();
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.resourceInstanceId, veyrithInstanceId));

		await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const beforeScanPreview = await previewFamilyScanForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const beforeSpots =
			beforeScanPreview.resources.find((resource) => resource.resourceSlug === veyrithSlug)?.spots ??
			[];
		expect(beforeSpots.length).toBeGreaterThan(0);

		const sample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: beforeSpots[0]!.spotId,
			bloomId: BLOOM_ONE_ID
		});
		expect(sample.status).toBe('ok');
		if (sample.status !== 'ok') {
			return;
		}

		await seedDepositSpotRemainingUnits(db, {
			spotId: beforeSpots[0]!.spotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 200
		});
		await deployClaimAndReturnExplanation(beforeSpots[0]!.spotId, sample.trueConcentrationPercent);

		await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const afterPreview = await previewFamilyScanForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const afterSpots =
			afterPreview.resources.find((resource) => resource.resourceSlug === veyrithSlug)?.spots ?? [];

		expect(afterSpots.map((spot) => spot.spotId)).not.toEqual(beforeSpots.map((spot) => spot.spotId));
		expect(afterSpots[0]?.spotId).toContain(':c2:spot:');
	});

	it('allows claim on a run deployed before the cycle rolled forward', async () => {
		await clearPilotRuns();
		await clearPilotProspectingState(db, testPilotId);
		await resetVeyrithCycle();
		await db.delete(depositSpotYields).where(eq(depositSpotYields.resourceInstanceId, veyrithInstanceId));

		const sample = await scanAndSample(cycleOneSpotId);
		await seedDepositSpotRemainingUnits(db, {
			spotId: cycleOneSpotId,
			resourceInstanceId: veyrithInstanceId,
			generationSeed: bloomGenerationSeed,
			remainingUnits: 200
		});

		const runSeed = `pre-cycle-claim-${Date.now()}`;
		const plan = generateSeededThumperEventWindows({
			runSeed,
			targetResourceId: veyrithSlug as NamedResourceId,
			isPushRun: false
		});
		const deployedAt = new Date(Date.now() - 120_000);
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			pilotFrameId: 'recon',
			targetResourceId: veyrithSlug as NamedResourceId,
			runSeed: plan.runSeed,
			isPushRun: false,
			deployedAt,
			durationSeconds: 60,
			depositSpotId: cycleOneSpotId,
			trueConcentrationPercent: sample.trueConcentrationPercent,
			extractionTailMinutes: 60,
			resourceInstanceId: veyrithInstanceId,
			windows: plan.windows
		});

		for (const window of plan.windows) {
			await recordThumperEventWindowResponse(db, {
				thumperRunId: run.id,
				windowIndex: window.windowIndex,
				chosenResponse: window.matchingAction
			});
		}

		await db
			.update(resourceInstances)
			.set({ prospectingCycle: 2 })
			.where(eq(resourceInstances.id, veyrithInstanceId));

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
		if (claim.status !== 'claimed') {
			return;
		}

		const stackAfter = await getResourceStackForPilotInstance(db, testPilotId, veyrithInstanceId);
		expect(stackAfter!.quantity).toBeGreaterThan(quantityBefore);
	});
});
