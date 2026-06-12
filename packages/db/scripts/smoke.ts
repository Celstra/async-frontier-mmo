import { and, eq, inArray, isNotNull, isNull } from 'drizzle-orm';
import {
	resolveTutorialThumperRunResult,
	resolveThumperState,
	spotIdFor,
	TUTORIAL_RUN_1_MINUTES,
	tutorialRunFromSeed,
	type ThumperEventActionId,
	type ThumperComplicationId
} from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID } from 'shared';
import {
	BLOOM_ONE_ID,
	claimOpenThumperRunForPilot,
	createDb,
	deployThumperRunWithEventWindows,
	ensureBloomOneResourceInstances,
	ensureDemoPilot,
	ensureStarterThumperPartsForPilot,
	getOpenThumperRunForPilot,
	getThumperRunPartSnapshots,
	partModifiersFromRunSnapshots,
	getBloomRecord,
	getResourceInstanceByBloomSlug,
	getResourceStackForPilotInstance,
	seedDepositSpotRemainingUnits,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	grantResourceToPilot,
	insertThumperRun,
	listEconomyLedgerEntriesForPilot,
	recordThumperEventWindowResponse
} from '../src/index.js';
import { thumperEventWindows } from '../src/schema/thumperEventWindows.js';
import { thumperRunPartSnapshots } from '../src/schema/thumperRunPartSnapshots.js';
import { thumperRunResults } from '../src/schema/thumperRunResults.js';
import { thumperRuns } from '../src/schema/thumperRuns.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is required (set in packages/db/.env)');
	process.exit(1);
}

const db = createDb(databaseUrl);

function failSmoke(message: string): never {
	console.error(`smoke failed: ${message}`);
	process.exit(1);
}

async function clearPilotThumperRuns() {
	const runs = await db
		.select({ id: thumperRuns.id })
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, DEMO_PILOT_ID));
	const runIds = runs.map((run) => run.id);
	if (runIds.length === 0) {
		return;
	}

	await db.delete(thumperRunResults).where(inArray(thumperRunResults.thumperRunId, runIds));
	await db.delete(thumperEventWindows).where(inArray(thumperEventWindows.thumperRunId, runIds));
	await db
		.delete(thumperRunPartSnapshots)
		.where(inArray(thumperRunPartSnapshots.thumperRunId, runIds));
	await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, DEMO_PILOT_ID));
}

function isRunClaimable(run: { deployedAt: Date; durationSeconds: number }, now: Date) {
	return (
		resolveThumperState({
			deployedAt: run.deployedAt,
			durationSeconds: run.durationSeconds,
			now
		}).status === 'claimable'
	);
}

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

async function claimTutorialRun(now: Date) {
	return claimOpenThumperRunForPilot(db, {
		pilotId: DEMO_PILOT_ID,
		now,
		isClaimable: (run, windows) => {
			if (windows.some((window) => window.chosenResponse === 'recall_early')) {
				return true;
			}
			return isRunClaimable(run, now);
		},
		isResolvableRun: (run) => tutorialRunFromSeed(run.runSeed) !== null,
		validateWindows: (_run, windows) => {
			if (windows.length === 0) {
				throw new Error('Thumper run has no event windows');
			}
		},
		buildResult: async (tx, run, windows) => {
			const tutorialRun = tutorialRunFromSeed(run.runSeed);
			if (tutorialRun === null) {
				throw new Error(`Unexpected tutorial run seed: ${run.runSeed}`);
			}

			const snapshots = await getThumperRunPartSnapshots(tx, run.id);
			return resolveTutorialThumperRunResult({
				tutorialRun,
				targetResourceId: 'veyrith_copper',
				projectedRecovery: 113,
				partModifiers: partModifiersFromRunSnapshots(snapshots),
				hullIntegrityAtDeploy: run.runHullIntegrity,
				plannedDurationSeconds: run.durationSeconds,
				eventWindows: windows.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication as ThumperComplicationId,
					matchingAction: window.matchingAction as ThumperEventActionId
				})),
				responses: windows
					.filter((window) => window.chosenResponse !== null)
					.map((window) => ({
						windowIndex: window.windowIndex,
						complication: window.complication as 'signal_drift' | 'pump_strain',
						chosenResponse: window.chosenResponse as
							| 'signal_tune'
							| 'clear_pump_problem'
							| 'recall_early'
					}))
			});
		},
		grantResourceReward: true
	});
}

await ensureDemoPilot(db);
await ensureStarterThumperPartsForPilot(db, DEMO_PILOT_ID, { autoEquip: true });

const bloomOne = await ensureBloomOneResourceInstances(db);
if (bloomOne.length !== 9) {
	failSmoke('bloom #1 seed should contain nine resource instances');
}

const veyrithInstance = await getResourceInstanceByBloomSlug(db, 1, 'veyrith_copper');
if (!veyrithInstance) {
	failSmoke('bloom #1 should include veyrith_copper instance');
}

const grantBeforeLedger = (await listEconomyLedgerEntriesForPilot(db, DEMO_PILOT_ID)).filter(
	(entry) => entry.eventType === 'resource_granted'
).length;

await grantResourceToPilot(db, {
	pilotId: DEMO_PILOT_ID,
	resourceInstanceId: veyrithInstance.id,
	quantity: 3,
	source: { type: 'smoke_test', id: 'grant-a' }
});
await grantResourceToPilot(db, {
	pilotId: DEMO_PILOT_ID,
	resourceInstanceId: veyrithInstance.id,
	quantity: 2,
	source: { type: 'smoke_test', id: 'grant-b' }
});

const veyrithStack = await getResourceStackForPilotInstance(
	db,
	DEMO_PILOT_ID,
	veyrithInstance.id
);
if (!veyrithStack || veyrithStack.quantity < 5) {
	failSmoke('duplicate grants should combine into one resource stack');
}

const grantAfterLedger = (await listEconomyLedgerEntriesForPilot(db, DEMO_PILOT_ID)).filter(
	(entry) => entry.eventType === 'resource_granted'
).length;
if (grantAfterLedger < grantBeforeLedger + 2) {
	failSmoke('every grant should append a resource_granted ledger row');
}

await clearPilotThumperRuns();

const tutorialRun1DurationSeconds = 60 + TUTORIAL_RUN_1_MINUTES * 60;
const deployedAt = new Date(Date.now() - (tutorialRun1DurationSeconds + 30) * 1000);
const targetResourceId = 'veyrith_copper';

const depositSpotId = spotIdFor(veyrithInstance.id, 3, 4);

const bloomOneRecord = await getBloomRecord(db, BLOOM_ONE_ID);
if (!bloomOneRecord) {
	failSmoke('bloom #1 record should exist for deposit spot seeding');
}
await seedDepositSpotRemainingUnits(db, {
	spotId: depositSpotId,
	resourceInstanceId: veyrithInstance.id,
	generationSeed: bloomOneRecord.generationSeed,
	remainingUnits: 500
});

const run = await deployThumperRunWithEventWindows(db, {
	pilotId: DEMO_PILOT_ID,
	targetResourceId,
	runSeed: 'tutorial-run-1',
	isPushRun: false,
	deployedAt,
	durationSeconds: tutorialRun1DurationSeconds,
	resourceInstanceId: veyrithInstance.id,
	depositSpotId,
	trueConcentrationPercent: 67,
	extractionTailMinutes: TUTORIAL_RUN_1_MINUTES,
	windows: [{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' }]
});

const windowsAfterDeploy = await getThumperEventWindowsForRun(db, run.id);
if (windowsAfterDeploy.length !== 1) {
	failSmoke('tutorial run 1 deploy should create one scripted event window');
}

await recordThumperEventWindowResponse(db, {
	thumperRunId: run.id,
	windowIndex: 1,
	chosenResponse: 'signal_tune'
});

const stackBeforeClaim = await getResourceStackForPilotInstance(
	db,
	DEMO_PILOT_ID,
	veyrithInstance.id
);
const quantityBeforeClaim = stackBeforeClaim?.quantity ?? 0;

const claimNow = new Date();
const firstClaim = await claimTutorialRun(claimNow);
if (firstClaim.status !== 'claimed' || !firstClaim.claimResult) {
	failSmoke('first claim should win and insert result');
}
if (!firstClaim.reward || firstClaim.reward.resourceInstanceId !== veyrithInstance.id) {
	failSmoke('first claim should grant Veyrith Copper to the bloom #1 instance');
}

const stackAfterFirstClaim = await getResourceStackForPilotInstance(
	db,
	DEMO_PILOT_ID,
	veyrithInstance.id
);
if (
	!stackAfterFirstClaim ||
	stackAfterFirstClaim.quantity !== quantityBeforeClaim + firstClaim.claimResult.recoveredQuantity
) {
	failSmoke('claim should increase the Veyrith stack by recovered quantity');
}

const ledgerAfterFirstClaim = await listEconomyLedgerEntriesForPilot(db, DEMO_PILOT_ID);
const grantsForFirstResult = ledgerGrantsForResult(
	ledgerAfterFirstClaim,
	firstClaim.claimResult.id
);
if (grantsForFirstResult.length !== 1) {
	failSmoke('first claim should write exactly one resource_granted ledger row');
}

const secondClaim = await claimTutorialRun(claimNow);
if (secondClaim.status !== 'already_claimed' || !secondClaim.claimResult) {
	failSmoke('second claim should return existing result idempotently');
}
if (secondClaim.claimResult.id !== firstClaim.claimResult.id) {
	failSmoke('double claim must not duplicate result row');
}
if (secondClaim.reward !== null) {
	failSmoke('second claim must not grant resources again');
}

const stackAfterSecondClaim = await getResourceStackForPilotInstance(
	db,
	DEMO_PILOT_ID,
	veyrithInstance.id
);
if (!stackAfterSecondClaim || stackAfterSecondClaim.quantity !== stackAfterFirstClaim.quantity) {
	failSmoke('double claim must not duplicate stack quantity');
}

const ledgerAfterSecondClaim = await listEconomyLedgerEntriesForPilot(db, DEMO_PILOT_ID);
if (
	ledgerGrantsForResult(ledgerAfterSecondClaim, firstClaim.claimResult.id).length !== 1
) {
	failSmoke('double claim must not duplicate ledger rows for the same result');
}

const [claimedRun] = await db.select().from(thumperRuns).where(eq(thumperRuns.id, run.id));
if (!claimedRun?.claimedAt) {
	failSmoke('normal claim path must set claimed_at when result exists');
}

const orphanResults = await db
	.select()
	.from(thumperRunResults)
	.innerJoin(thumperRuns, eq(thumperRunResults.thumperRunId, thumperRuns.id))
	.where(and(eq(thumperRuns.pilotId, DEMO_PILOT_ID), isNull(thumperRuns.claimedAt)));

if (orphanResults.length > 0) {
	failSmoke('result row must not exist on an unclaimed run after normal claim path');
}

const claimedRunsWithResults = await db
	.select({ runId: thumperRuns.id, claimedAt: thumperRuns.claimedAt })
	.from(thumperRunResults)
	.innerJoin(thumperRuns, eq(thumperRunResults.thumperRunId, thumperRuns.id))
	.where(and(eq(thumperRuns.pilotId, DEMO_PILOT_ID), isNotNull(thumperRuns.claimedAt)));

if (claimedRunsWithResults.length < 1) {
	failSmoke('expected at least one claimed run with stored result from first claim');
}

await clearPilotThumperRuns();

const runWithoutWindows = await insertThumperRun(db, {
	pilotId: DEMO_PILOT_ID,
	targetResourceId,
	runSeed: 'tutorial-run-1',
	isPushRun: false,
	deployedAt: new Date(Date.now() - 120_000),
	durationSeconds: 60,
	resourceInstanceId: veyrithInstance.id,
	depositSpotId
});

const windowsMissing = await getThumperEventWindowsForRun(db, runWithoutWindows.id);
if (windowsMissing.length !== 0) {
	failSmoke('control run should have zero windows');
}

const invalidClaim = await claimTutorialRun(new Date());
if (invalidClaim.status !== 'invalid_windows') {
	failSmoke('Veyrith run with zero windows must not claim with a result');
}

const openAfterInvalidClaim = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);
if (!openAfterInvalidClaim || openAfterInvalidClaim.id !== runWithoutWindows.id) {
	failSmoke('invalid claim should leave the run open with no result');
}

const resultAfterInvalidClaim = await getThumperRunResultForRun(db, runWithoutWindows.id);
if (resultAfterInvalidClaim) {
	failSmoke('invalid claim must not insert thumper_run_result');
}

console.log({
	deployedRunId: run.id,
	windowsAfterDeploy: windowsAfterDeploy.length,
	firstClaim: firstClaim.claimResult.id,
	secondClaimStatus: secondClaim.status,
	invalidClaimStatus: invalidClaim.status
});

console.log('smoke ok');
process.exit(0);
