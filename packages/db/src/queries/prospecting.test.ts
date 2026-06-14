import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	FAMILY_SCAN_ENERGY_COST,
	generateDepositSpots,
	SAMPLE_ENERGY_COST,
	SPOT_SAMPLE_POOL,
	sampleYieldFromConcentration,
	SURVEY_ENERGY_CAP
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { pilots } from '../schema/pilots.js';
import { pilotSurveyEnergy } from '../schema/pilotSurveyEnergy.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { listEconomyLedgerEntriesForPilot } from './economyLedger.js';
import { getBloomRecord } from './bloomRotation.js';
import {
	clearPilotProspectingState,
	getPilotProspectingProgress,
	hasPilotFamilyScan,
	previewFamilyScanForPilot,
	sampleSpotForPilot,
	scanFamilyForPilot
} from './prospecting.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { settlementOrders } from '../schema/settlementOrders.js';
import {
	clearPilotSettlementState,
	ensureSettlementBootstrapForPilot,
	listOpenSettlementOrdersForPilot
} from './settlement.js';
import { setPilotTutorialStep, clearPilotTutorialState } from './tutorialState.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('prospecting persistence', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-65-prospect-${Date.now()}`;

	let veyrithInstanceId = '';
	let veyrithSlug = '';
	let firstSpotId = '';
	let firstSpotExpectedYield = 1;

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();

		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(veyrith).not.toBeNull();
		veyrithInstanceId = veyrith!.id;
		veyrithSlug = veyrith!.resourceSlug;

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		// Use the resource's actual prospectingCycle so spot IDs match
		const spots = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed: bloom!.generationSeed,
			concentrationMinPercent: veyrith!.concentrationMinPercent,
			concentrationMaxPercent: veyrith!.concentrationMaxPercent,
			prospectingCycle: veyrith!.prospectingCycle
		});
		expect(spots.length).toBeGreaterThan(0);
		firstSpotId = spots[0]!.spotId;
		firstSpotExpectedYield = sampleYieldFromConcentration(spots[0]!.trueConcentrationPercent);
	});

	afterAll(async () => {
		await clearPilotProspectingState(db, testPilotId);
		await clearPilotSettlementState(db, testPilotId);
		await clearPilotTutorialState(db, testPilotId);
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	async function scanConductiveMetalFamily() {
		const scan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		expect(scan.status).toBe('ok');
	}

	it('rejects sample before paid family scan', async () => {
		await clearPilotProspectingState(db, testPilotId);

		const result = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: firstSpotId
		});

		expect(result.status).toBe('family_scan_required');

		const progress = await getPilotProspectingProgress(db, testPilotId);
		expect(progress.sampledSpotIds).toHaveLength(0);
		expect(progress.surveyEnergy).toBe(SURVEY_ENERGY_CAP);
	});

	it('first sample reveals stats, grants trickle, and writes survey_completed ledger row', async () => {
		await clearPilotProspectingState(db, testPilotId);

		const beforeLedger = (await listEconomyLedgerEntriesForPilot(db, testPilotId)).filter(
			(entry) => entry.eventType === 'survey_completed'
		);

		await scanConductiveMetalFamily();

		const result = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: firstSpotId
		});

		expect(result.status).toBe('ok');
		if (result.status !== 'ok') {
			return;
		}

		expect(result.statsRevealedThisSample).toBe(true);
		expect(result.trickleQuantity).toBe(firstSpotExpectedYield);
		// First sample of a resource is energy-free (stat-reveal rule).
		expect(result.energyCost).toBe(0);
		expect(result.surveyEnergy).toBe(SURVEY_ENERGY_CAP - FAMILY_SCAN_ENERGY_COST);

		const stack = await getResourceStackForPilotInstance(db, testPilotId, veyrithInstanceId);
		expect(stack?.quantity).toBe(firstSpotExpectedYield);

		const progress = await getPilotProspectingProgress(db, testPilotId);
		expect(progress.revealedResourceSlugs).toContain(veyrithSlug);
		expect(progress.sampledSpotIds).toContain(firstSpotId);

		const preview = await previewFamilyScanForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const veyrithView = preview.resources.find((resource) => resource.resourceSlug === veyrithSlug);
		expect(veyrithView?.statsVisible).toBe(true);
		expect(veyrithView?.stats).not.toBeNull();

		const surveyCompleted = (await listEconomyLedgerEntriesForPilot(db, testPilotId)).filter(
			(entry) => entry.eventType === 'survey_completed'
		);
		expect(surveyCompleted.length).toBe(beforeLedger.length + 1);
		const latest = surveyCompleted.at(-1)!;
   expect(latest.quantityDelta).toBe(firstSpotExpectedYield);
		expect(latest.resourceInstanceId).toBe(veyrithInstanceId);
		expect(latest.payload).toMatchObject({
			family: 'conductive_metal',
			resource_instance_id: veyrithInstanceId,
			spot: firstSpotId,
			trickle_quantity: firstSpotExpectedYield
		});
	});

	it('allows repeat samples on the same spot until the pool is exhausted', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await scanConductiveMetalFamily();

		let stackQuantity = 0;
		const ledgerBaseline = (await listEconomyLedgerEntriesForPilot(db, testPilotId)).filter(
			(entry) => entry.eventType === 'survey_completed'
		).length;

		for (let sampleIndex = 0; sampleIndex < SPOT_SAMPLE_POOL; sampleIndex += 1) {
			const result = await sampleSpotForPilot(db, {
				pilotId: testPilotId,
				resourceInstanceId: veyrithInstanceId,
				spotId: firstSpotId
			});
			expect(result.status).toBe('ok');

			const stack = await getResourceStackForPilotInstance(db, testPilotId, veyrithInstanceId);
			expect(stack?.quantity).toBeGreaterThan(stackQuantity);
			stackQuantity = stack?.quantity ?? 0;

			const ledger = (await listEconomyLedgerEntriesForPilot(db, testPilotId)).filter(
				(entry) => entry.eventType === 'survey_completed'
			);
			expect(ledger.length).toBe(ledgerBaseline + sampleIndex + 1);
		}

		const exhausted = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: firstSpotId
		});
		expect(exhausted.status).toBe('spot_pool_exhausted');
	});

	it('spends energy and rejects insufficient energy cleanly', async () => {
		await clearPilotProspectingState(db, testPilotId);

		const scan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		expect(scan.status).toBe('ok');
		if (scan.status !== 'ok') {
			return;
		}
		expect(scan.energyCost).toBe(FAMILY_SCAN_ENERGY_COST);
		expect(scan.surveyEnergy).toBe(SURVEY_ENERGY_CAP - FAMILY_SCAN_ENERGY_COST);

		// Burn the free stat-reveal sample so the next sample is a paid one.
		const revealSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: firstSpotId
		});
		expect(revealSample.status).toBe('ok');

		const lowEnergyAt = new Date();
		await db
			.update(pilotSurveyEnergy)
			.set({ rawEnergy: 5, updatedAt: lowEnergyAt })
			.where(eq(pilotSurveyEnergy.pilotId, testPilotId));

		const progress = await getPilotProspectingProgress(db, testPilotId, lowEnergyAt);
		expect(progress.surveyEnergy).toBe(5);
		expect(progress.surveyEnergy).toBeLessThan(SAMPLE_ENERGY_COST);

		const rejected = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: firstSpotId,
			now: lowEnergyAt
		});
		expect(rejected.status).toBe('insufficient_energy');
	});

	it('stat reveal persists across calls', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await scanConductiveMetalFamily();

		const sample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: firstSpotId
		});
		expect(sample.status).toBe('ok');
		if (sample.status !== 'ok') {
			return;
		}
		expect(sample.statsRevealedThisSample).toBe(true);

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(veyrith).not.toBeNull();
		const spots = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed: bloom!.generationSeed,
			concentrationMinPercent: 30,
			concentrationMaxPercent: 67,
			prospectingCycle: veyrith!.prospectingCycle
		});
		const otherSpot = spots.find((spot) => spot.spotId !== firstSpotId);
		expect(otherSpot).toBeDefined();

		const secondSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: otherSpot!.spotId
		});
		expect(secondSample.status).toBe('ok');
		if (secondSample.status !== 'ok') {
			return;
		}
		expect(secondSample.statsRevealedThisSample).toBe(false);

		const preview = await previewFamilyScanForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		const veyrithView = preview.resources.find((resource) => resource.resourceSlug === veyrithSlug);
		expect(veyrithView?.statsVisible).toBe(true);
		expect(veyrithView?.stats?.conductivity).toBe(930);
	});

	it('records paid family scan for bloom gating', async () => {
		await clearPilotProspectingState(db, testPilotId);

		expect(
			await hasPilotFamilyScan(db, {
				pilotId: testPilotId,
				bloomId: BLOOM_ONE_ID,
				family: 'conductive_metal'
			})
		).toBe(false);

		const scan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'conductive_metal',
			bloomId: BLOOM_ONE_ID
		});
		expect(scan.status).toBe('ok');

		expect(
			await hasPilotFamilyScan(db, {
				pilotId: testPilotId,
				bloomId: BLOOM_ONE_ID,
				family: 'conductive_metal'
			})
		).toBe(true);
	});

	it('does not persist sample when concurrent energy spend loses the race', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await scanConductiveMetalFamily();

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(veyrith).not.toBeNull();
		const spots = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed: bloom!.generationSeed,
			concentrationMinPercent: 30,
			concentrationMaxPercent: 67,
			prospectingCycle: veyrith!.prospectingCycle
		});
		expect(spots.length).toBeGreaterThan(1);

		// Burn the free stat-reveal sample so both racing samples are paid ones.
		const revealSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: spots[0]!.spotId
		});
		expect(revealSample.status).toBe('ok');

		const lowEnergyAt = new Date();
		await db
			.update(pilotSurveyEnergy)
			.set({ rawEnergy: SAMPLE_ENERGY_COST, updatedAt: lowEnergyAt })
			.where(eq(pilotSurveyEnergy.pilotId, testPilotId));

		const [first, second] = await Promise.all([
			sampleSpotForPilot(db, {
				pilotId: testPilotId,
				resourceInstanceId: veyrithInstanceId,
				spotId: spots[0]!.spotId,
				now: lowEnergyAt
			}),
			sampleSpotForPilot(db, {
				pilotId: testPilotId,
				resourceInstanceId: veyrithInstanceId,
				spotId: spots[1]!.spotId,
				now: lowEnergyAt
			})
		]);

		const statuses = [first.status, second.status];
		expect(statuses.filter((status) => status === 'ok')).toHaveLength(1);
		expect(statuses.filter((status) => status === 'insufficient_energy')).toHaveLength(1);

		const progress = await getPilotProspectingProgress(db, testPilotId);
		expect(progress.sampledSpotIds).toHaveLength(1);
	});

	it('tutorial free sample binds the pinned structural alloy order', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await clearPilotSettlementState(db, testPilotId);
		await ensureSettlementBootstrapForPilot(db, testPilotId);
		await setPilotTutorialStep(db, { pilotId: testPilotId, step: 'first_orders' });

		const saOrder = (await listOpenSettlementOrdersForPilot(db, testPilotId)).find(
			(order) => order.family === 'structural_alloy'
		);
		expect(saOrder).toBeDefined();

		const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
		expect(keth).not.toBeNull();

		const scan = await scanFamilyForPilot(db, {
			pilotId: testPilotId,
			family: 'structural_alloy',
			bloomId: BLOOM_ONE_ID
		});
		expect(scan.status).toBe('ok');

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		const spots = generateDepositSpots({
			resourceSlug: keth!.resourceSlug,
			bloomGenerationSeed: bloom!.generationSeed,
			concentrationMinPercent: keth!.concentrationMinPercent,
			concentrationMaxPercent: keth!.concentrationMaxPercent,
			prospectingCycle: keth!.prospectingCycle
		});
		expect(spots.length).toBeGreaterThan(0);

		const freeSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: keth!.id,
			spotId: spots[0]!.spotId
		});
		expect(freeSample.status).toBe('ok');
		if (freeSample.status === 'ok') {
			expect(freeSample.energyCost).toBe(0);
		}

		const [boundRow] = await db
			.select()
			.from(settlementOrders)
			.where(eq(settlementOrders.id, saOrder!.id))
			.limit(1);
		expect(boundRow?.boundInstanceId).toBe(keth!.id);
	});

	it('post-tutorial free sample does not bind settlement orders; paid sample does', async () => {
		await clearPilotProspectingState(db, testPilotId);
		await clearPilotSettlementState(db, testPilotId);
		await ensureSettlementBootstrapForPilot(db, testPilotId);
		await setPilotTutorialStep(db, { pilotId: testPilotId, step: 'done' });
		await scanConductiveMetalFamily();

		const orders = await listOpenSettlementOrdersForPilot(db, testPilotId);
		const cmOrder = orders.find((order) => order.family === 'conductive_metal');
		expect(cmOrder).toBeDefined();

		const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
		expect(bloom).not.toBeNull();
		const spots = generateDepositSpots({
			resourceSlug: veyrithSlug,
			bloomGenerationSeed: bloom!.generationSeed,
			concentrationMinPercent: 30,
			concentrationMaxPercent: 67,
			prospectingCycle: (
				await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, veyrithSlug)
			)!.prospectingCycle
		});
		expect(spots.length).toBeGreaterThan(1);

		const freeSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: spots[0]!.spotId
		});
		expect(freeSample.status).toBe('ok');
		if (freeSample.status === 'ok') {
			expect(freeSample.energyCost).toBe(0);
		}

		const [unboundRow] = await db
			.select()
			.from(settlementOrders)
			.where(eq(settlementOrders.id, cmOrder!.id))
			.limit(1);
		expect(unboundRow?.boundInstanceId).toBeNull();

		const paidSample = await sampleSpotForPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			spotId: spots[1]!.spotId
		});
		expect(paidSample.status).toBe('ok');
		if (paidSample.status === 'ok') {
			expect(paidSample.energyCost).toBeGreaterThan(0);
		}

		const [boundRow] = await db
			.select()
			.from(settlementOrders)
			.where(eq(settlementOrders.id, cmOrder!.id))
			.limit(1);
		expect(boundRow?.boundInstanceId).toBe(veyrithInstanceId);
	});
});
