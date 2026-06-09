import { and, eq, isNull } from 'drizzle-orm';
import { resolveFirstSessionThumperRunResult } from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID } from 'shared';
import {
	claimThumperRun,
	createDb,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	insertThumperEventWindows,
	insertThumperRun,
	insertThumperRunResult,
	recordThumperEventWindowResponse
} from '../src/index.js';
import { thumperRuns } from '../src/schema/thumperRuns.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is required (set in packages/db/.env)');
	process.exit(1);
}

const db = createDb(databaseUrl);

// Clear leftover open runs from local dev before asserting invariants
await db
	.update(thumperRuns)
	.set({ claimedAt: new Date() })
	.where(and(eq(thumperRuns.pilotId, DEMO_PILOT_ID), isNull(thumperRuns.claimedAt)));

const deployedAt = new Date(Date.now() - 120_000);
const durationSeconds = 60;
const targetResourceId = 'veyrith_copper';

const run = await insertThumperRun(db, {
	pilotId: DEMO_PILOT_ID,
	targetResourceId,
	deployedAt,
	durationSeconds
});

await insertThumperEventWindows(db, {
	thumperRunId: run.id,
	windows: [
		{
			windowIndex: 1,
			complication: 'signal_drift',
			matchingAction: 'signal_tune'
		},
		{
			windowIndex: 2,
			complication: 'pump_strain',
			matchingAction: 'clear_pump_problem'
		}
	]
});

const open = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);
const windowsBefore = await getThumperEventWindowsForRun(db, run.id);

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

const windowsAfter = await getThumperEventWindowsForRun(db, run.id);
const result = resolveFirstSessionThumperRunResult({
	targetResourceId: 'veyrith_copper',
	responses: windowsAfter.map((window) => ({
		windowIndex: window.windowIndex,
		complication: window.complication as 'signal_drift' | 'pump_strain',
		chosenResponse: window.chosenResponse as 'signal_tune' | 'clear_pump_problem'
	}))
});

await insertThumperRunResult(db, {
	thumperRunId: run.id,
	targetResourceId: result.targetResourceId,
	projectedRecovery: result.projectedRecovery,
	recoveredQuantity: result.recoveredQuantity,
	wasteQuantity: result.wasteQuantity,
	explanation: result.explanation,
	resolvedAt: new Date()
});

const claimed = await claimThumperRun(db, run.id);
const storedResult = await getThumperRunResultForRun(db, run.id);
const openAfterClaim = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

console.log({
	runId: run.id,
	open: open?.id,
	windowsBefore: windowsBefore.length,
	windowsAfter: windowsAfter.map((w) => w.chosenResponse),
	result,
	claimed: claimed?.id,
	storedResult: storedResult?.recoveredQuantity,
	openAfterClaim
});

if (!open || open.id !== run.id) {
	console.error('smoke failed: open thumper should match insert');
	process.exit(1);
}
if (windowsBefore.length !== 2) {
	console.error('smoke failed: expected two event windows');
	process.exit(1);
}
if (windowsAfter.some((window) => window.chosenResponse === null)) {
	console.error('smoke failed: responses should be recorded');
	process.exit(1);
}
if (result.recoveredQuantity !== 60 || result.wasteQuantity !== 0) {
	console.error('smoke failed: perfect responses should yield full tutorial recovery');
	process.exit(1);
}
if (!storedResult || storedResult.recoveredQuantity !== 60) {
	console.error('smoke failed: run result should be stored');
	process.exit(1);
}
if (!claimed || openAfterClaim !== null) {
	console.error('smoke failed: claim should close the open run');
	process.exit(1);
}

console.log('smoke ok');
process.exit(0);
