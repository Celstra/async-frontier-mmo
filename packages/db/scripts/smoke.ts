import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import {
	assertVeyrithTutorialWindowsReady,
	resolveFirstSessionThumperRunResult,
	resolveThumperState,
	type ThumperEventActionId
} from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID, parseFrameId } from 'shared';
import {
	claimOpenThumperRunForPilot,
	createDb,
	deployThumperRunWithEventWindows,
	ensureDemoPilot,
	getOpenThumperRunForPilot,
	getPilotFrame,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	insertThumperRun,
	recordThumperEventWindowResponse
} from '../src/index.js';
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

async function clearOpenRuns() {
	await db
		.update(thumperRuns)
		.set({ claimedAt: new Date() })
		.where(and(eq(thumperRuns.pilotId, DEMO_PILOT_ID), isNull(thumperRuns.claimedAt)));
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

async function claimTutorialRun(now: Date) {
	return claimOpenThumperRunForPilot(db, {
		pilotId: DEMO_PILOT_ID,
		now,
		isClaimable: (run) => isRunClaimable(run, now),
		isResolvableRun: (run) => run.runSeed === 'first-session-scripted',
		validateWindows: (run, windows) => {
			if (run.runSeed === 'first-session-scripted') {
				assertVeyrithTutorialWindowsReady(windows);
			}
		},
		buildResult: (run, windows) =>
			resolveFirstSessionThumperRunResult({
				targetResourceId: 'veyrith_copper',
				pilotFrame: parseFrameId(run.pilotFrameId),
				eventWindows: windows.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication as 'signal_drift' | 'pump_strain',
					matchingAction: window.matchingAction as ThumperEventActionId
				})),
				responses: windows.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication as 'signal_drift' | 'pump_strain',
					chosenResponse: window.chosenResponse as 'signal_tune' | 'clear_pump_problem'
				}))
			})
	});
}

await ensureDemoPilot(db);
const pilotFrame = await getPilotFrame(db, DEMO_PILOT_ID);
if (pilotFrame !== 'recon') {
	failSmoke('demo pilot should default to recon frame');
}

await clearOpenRuns();

const deployedAt = new Date(Date.now() - 120_000);
const durationSeconds = 60;
const targetResourceId = 'veyrith_copper';

const run = await deployThumperRunWithEventWindows(db, {
	pilotId: DEMO_PILOT_ID,
	pilotFrameId: pilotFrame,
	targetResourceId,
	runSeed: 'first-session-scripted',
	isPushRun: false,
	deployedAt,
	durationSeconds,
	windows: [
		{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' },
		{ windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
	]
});

if (run.pilotFrameId !== 'recon') {
	failSmoke('deploy should snapshot pilot frame on thumper_runs');
}

const windowsAfterDeploy = await getThumperEventWindowsForRun(db, run.id);
if (windowsAfterDeploy.length !== 2) {
	failSmoke('deploy transaction should create run and two event windows together');
}

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
const firstClaim = await claimTutorialRun(claimNow);
if (firstClaim.status !== 'claimed' || !firstClaim.claimResult) {
	failSmoke('first claim should win and insert result');
}

const secondClaim = await claimTutorialRun(claimNow);
if (secondClaim.status !== 'already_claimed' || !secondClaim.claimResult) {
	failSmoke('second claim should return existing result idempotently');
}
if (secondClaim.claimResult.id !== firstClaim.claimResult.id) {
	failSmoke('double claim must not duplicate result row');
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

await clearOpenRuns();

const runWithoutWindows = await insertThumperRun(db, {
	pilotId: DEMO_PILOT_ID,
	pilotFrameId: pilotFrame,
	targetResourceId,
	runSeed: 'first-session-scripted',
	isPushRun: false,
	deployedAt: new Date(Date.now() - 120_000),
	durationSeconds: 60
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

const claimedRunsWithResults = await db
	.select({ runId: thumperRuns.id, claimedAt: thumperRuns.claimedAt })
	.from(thumperRunResults)
	.innerJoin(thumperRuns, eq(thumperRunResults.thumperRunId, thumperRuns.id))
	.where(and(eq(thumperRuns.pilotId, DEMO_PILOT_ID), isNotNull(thumperRuns.claimedAt)));

if (claimedRunsWithResults.length < 1) {
	failSmoke('expected at least one claimed run with stored result from first claim');
}

console.log({
	deployedRunId: run.id,
	pilotFrameId: run.pilotFrameId,
	windowsAfterDeploy: windowsAfterDeploy.length,
	firstClaim: firstClaim.claimResult.id,
	secondClaimStatus: secondClaim.status,
	invalidClaimStatus: invalidClaim.status
});

console.log('smoke ok');
process.exit(0);
