import { eq, inArray } from 'drizzle-orm';
import { FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED } from '@async-frontier-mmo/domain';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import type { Db } from '../client.js';
import { craftingAttempts } from '../schema/craftingAttempts.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilotDepositSpotSamples } from '../schema/pilotDepositSpotSamples.js';
import { pilotFamilyScans } from '../schema/pilotFamilyScans.js';
import { pilotFieldState } from '../schema/pilotFieldState.js';
import { pilotResourceStatReveals } from '../schema/pilotResourceStatReveals.js';
import { pilotSurveyEnergy } from '../schema/pilotSurveyEnergy.js';
import { pilots } from '../schema/pilots.js';
import { playtestEvents } from '../schema/playtestEvents.js';
import { repairActions } from '../schema/repairActions.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { settlementMilestones } from '../schema/settlementMilestones.js';
import { settlementOrders } from '../schema/settlementOrders.js';
import { thumperEventWindows } from '../schema/thumperEventWindows.js';
import { thumperRunCommandLog } from '../schema/thumperRunCommandLog.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { pilotWorkshopState } from '../schema/pilotWorkshopState.js';
import { workshopCrates } from '../schema/workshopCrates.js';
import { workshopReclaims } from '../schema/workshopReclaims.js';
import { ensureSessionPilot } from './pilots.js';
import { grantResourceToPilot } from './resourceGrants.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import { clearPilotTutorialState, setPilotTutorialStep } from './tutorialState.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';
import { PROJECT_LED_COMMAND_QUEUE_RUN_MODE } from './thumperRunWorkflow.js';
import { insertThumperRun } from './thumperRuns.js';
import { createWorkshopCrateTx } from './workshopCrates.js';
import {
	ensurePilotWorkshopStateTx,
	ensureWorkshopBenchResourceInstances,
	ensureWorkshopStarterGrantForPilot
} from './workshopSlice.js';

/** Fabricator-unlocked pilot with enough scanner materials for one browser craft smoke run. */
export async function seedScannerCraftPilotForSmoke(db: Db, pilotId: string): Promise<void> {
	await ensureSessionPilot(db, pilotId);
	await ensureBloomOneResourceInstances(db);
	await setPilotTutorialStep(db, { pilotId, step: 'done' });

	await db
		.insert(settlementMilestones)
		.values({
			pilotId,
			milestoneKey: 'fabricator_online',
			unlockedAt: new Date()
		})
		.onConflictDoNothing();

	const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
	const pale = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'pale_ember_crystal');
	const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
	if (!veyrith || !pale || !keth) {
		throw new Error('Scanner craft resource instances missing for smoke seed');
	}

	const source = { type: 'test_grant' as const, id: `craft-reveal-smoke-${pilotId}` };
	for (const row of [
		{ resourceInstanceId: veyrith.id, quantity: 60 },
		{ resourceInstanceId: pale.id, quantity: 60 },
		{ resourceInstanceId: keth.id, quantity: 60 }
	]) {
		await grantResourceToPilot(db, {
			pilotId,
			resourceInstanceId: row.resourceInstanceId,
			quantity: row.quantity,
			source
		});
	}
}

export async function seedCommandQueuePilotForSmoke(db: Db, pilotId: string): Promise<void> {
	await ensureSessionPilot(db, pilotId);
	await ensureBloomOneResourceInstances(db);
	await ensureStarterThumperPartsForPilot(db, pilotId, { autoEquip: true });
	const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
	if (!keth) {
		throw new Error('Keth Iron resource instance missing for command queue smoke seed');
	}

	await insertThumperRun(db, {
		pilotId,
		targetResourceId: 'keth_iron',
		runSeed: FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
		isPushRun: false,
		deployedAt: new Date('2026-06-22T16:00:00.000Z'),
		durationSeconds: 180,
		resourceInstanceId: keth.id,
		runMode: PROJECT_LED_COMMAND_QUEUE_RUN_MODE
	});
}

/** Remove rows created by {@link seedCommandQueuePilotForSmoke}. */
export async function cleanupCommandQueuePilotForSmoke(db: Db, pilotId: string): Promise<void> {
	const pilotRuns = await db
		.select({ id: thumperRuns.id })
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, pilotId));
	const runIds = pilotRuns.map((run) => run.id);

	await db.delete(repairActions).where(eq(repairActions.pilotId, pilotId));

	if (runIds.length > 0) {
		await db.delete(thumperRunCommandLog).where(inArray(thumperRunCommandLog.runId, runIds));
		await db.delete(thumperRunResults).where(inArray(thumperRunResults.thumperRunId, runIds));
		await db.delete(thumperEventWindows).where(inArray(thumperEventWindows.thumperRunId, runIds));
		await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, pilotId));
	}

	await db
		.update(pilots)
		.set({
			equippedScannerItemId: null,
			equippedDrillItemId: null,
			equippedPumpItemId: null,
			equippedHullItemId: null
		})
		.where(eq(pilots.id, pilotId));
	await db.delete(items).where(eq(items.pilotId, pilotId));
	await db.delete(economyLedger).where(eq(economyLedger.pilotId, pilotId));
	await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, pilotId));
	await db.delete(pilotDepositSpotSamples).where(eq(pilotDepositSpotSamples.pilotId, pilotId));
	await db.delete(pilotResourceStatReveals).where(eq(pilotResourceStatReveals.pilotId, pilotId));
	await db.delete(pilotFamilyScans).where(eq(pilotFamilyScans.pilotId, pilotId));
	await db.delete(pilotSurveyEnergy).where(eq(pilotSurveyEnergy.pilotId, pilotId));
	await db.delete(pilotFieldState).where(eq(pilotFieldState.pilotId, pilotId));
	await db.delete(settlementOrders).where(eq(settlementOrders.pilotId, pilotId));
	await db.delete(settlementMilestones).where(eq(settlementMilestones.pilotId, pilotId));
	await db.delete(playtestEvents).where(eq(playtestEvents.pilotId, pilotId));
	await clearPilotTutorialState(db, pilotId);
	await db.delete(pilots).where(eq(pilots.id, pilotId));
}

/** Workshop-first pilot with bench starter grant for browser smoke. */
export async function seedWorkshopCraftPilotForSmoke(db: Db, pilotId: string): Promise<void> {
	await ensureSessionPilot(db, pilotId);
	await ensureWorkshopBenchResourceInstances(db);
	await ensureWorkshopStarterGrantForPilot(db, pilotId);
}

/** Mint one timer crate for workshop open-crate smoke paths. */
export async function mintWorkshopTimerCrateForSmoke(db: Db, pilotId: string): Promise<void> {
	await ensurePilotWorkshopStateTx(db, pilotId);
	await createWorkshopCrateTx(db, { pilotId, reason: 'timer' });
}

/** Remove workshop slice rows plus shared smoke pilot cleanup. */
export async function cleanupWorkshopCraftPilotForSmoke(db: Db, pilotId: string): Promise<void> {
	await deleteAllSmokePilotData(db, pilotId);
}

/**
 * Delete every row owned by a smoke pilot before removing the pilot row.
 * Keeps browser smoke teardown from chasing one FK at a time.
 */
export async function deleteAllSmokePilotData(db: Db, pilotId: string): Promise<void> {
	const pilotRuns = await db
		.select({ id: thumperRuns.id })
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, pilotId));
	const runIds = pilotRuns.map((run) => run.id);

	await db.delete(repairActions).where(eq(repairActions.pilotId, pilotId));

	if (runIds.length > 0) {
		await db.delete(thumperRunCommandLog).where(inArray(thumperRunCommandLog.runId, runIds));
		await db.delete(thumperRunResults).where(inArray(thumperRunResults.thumperRunId, runIds));
		await db.delete(thumperEventWindows).where(inArray(thumperEventWindows.thumperRunId, runIds));
		await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, pilotId));
	}

	await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, pilotId));
	await db.delete(workshopReclaims).where(eq(workshopReclaims.pilotId, pilotId));
	await db.delete(workshopCrates).where(eq(workshopCrates.pilotId, pilotId));
	await db.delete(pilotWorkshopState).where(eq(pilotWorkshopState.pilotId, pilotId));
	await db
		.update(pilots)
		.set({
			equippedScannerItemId: null,
			equippedDrillItemId: null,
			equippedPumpItemId: null,
			equippedHullItemId: null
		})
		.where(eq(pilots.id, pilotId));
	await db.delete(items).where(eq(items.pilotId, pilotId));
	await db.delete(economyLedger).where(eq(economyLedger.pilotId, pilotId));
	await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, pilotId));
	await db.delete(pilotDepositSpotSamples).where(eq(pilotDepositSpotSamples.pilotId, pilotId));
	await db.delete(pilotResourceStatReveals).where(eq(pilotResourceStatReveals.pilotId, pilotId));
	await db.delete(pilotFamilyScans).where(eq(pilotFamilyScans.pilotId, pilotId));
	await db.delete(pilotSurveyEnergy).where(eq(pilotSurveyEnergy.pilotId, pilotId));
	await db.delete(pilotFieldState).where(eq(pilotFieldState.pilotId, pilotId));
	await db.delete(settlementOrders).where(eq(settlementOrders.pilotId, pilotId));
	await db.delete(settlementMilestones).where(eq(settlementMilestones.pilotId, pilotId));
	await db.delete(playtestEvents).where(eq(playtestEvents.pilotId, pilotId));
	await clearPilotTutorialState(db, pilotId);
	await db.delete(pilots).where(eq(pilots.id, pilotId));
}

/** Remove rows created by {@link seedScannerCraftPilotForSmoke}. */
export async function cleanupScannerCraftPilotForSmoke(db: Db, pilotId: string): Promise<void> {
	await deleteAllSmokePilotData(db, pilotId);
}
