import { and, eq, isNull } from 'drizzle-orm';
import { DEMO_PILOT_ID } from 'shared';
import {
	claimThumperRun,
	createDb,
	getOpenThumperRunForPilot,
	insertThumperRun
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

// Use a past deploy so claim is immediately eligible
const deployedAt = new Date(Date.now() - 120_000);
const durationSeconds = 60;
const targetResourceId = 'veyrith_copper';

const inserted = await insertThumperRun(db, {
	pilotId: DEMO_PILOT_ID,
	targetResourceId,
	deployedAt,
	durationSeconds
});
const open = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

let secondInsertBlocked = false;
try {
	await insertThumperRun(db, {
		pilotId: DEMO_PILOT_ID,
		targetResourceId,
		deployedAt: new Date(),
		durationSeconds: 60
	});
} catch {
	secondInsertBlocked = true;
}

const claimed = await claimThumperRun(db, inserted.id);
const openAfterClaim = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

const redeployed = await insertThumperRun(db, {
	pilotId: DEMO_PILOT_ID,
	targetResourceId: 'keth_iron',
	deployedAt: new Date(),
	durationSeconds: 60
});
const openAfterRedeploy = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

console.log({
	inserted,
	open: open?.id,
	secondInsertBlocked,
	claimed: claimed?.id,
	openAfterClaim,
	redeployed: redeployed.id,
	openAfterRedeploy: openAfterRedeploy?.id
});

if (!open || open.id !== inserted.id) {
	console.error('smoke failed: open thumper should match insert');
	process.exit(1);
}
if (open.targetResourceId !== targetResourceId) {
	console.error('smoke failed: open run should store target_resource_id');
	process.exit(1);
}
if (!secondInsertBlocked) {
	console.error('smoke failed: second open insert should be blocked by unique index');
	process.exit(1);
}
if (!claimed || openAfterClaim !== null) {
	console.error('smoke failed: claim should close the open run');
	process.exit(1);
}
if (!openAfterRedeploy || openAfterRedeploy.id !== redeployed.id) {
	console.error('smoke failed: redeploy after claim should succeed');
	process.exit(1);
}
if (openAfterRedeploy.targetResourceId !== 'keth_iron') {
	console.error('smoke failed: redeploy should store new target_resource_id');
	process.exit(1);
}

console.log('smoke ok');
process.exit(0);
