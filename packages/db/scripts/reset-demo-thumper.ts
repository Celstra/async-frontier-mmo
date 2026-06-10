import { and, eq, isNull } from 'drizzle-orm';
import { DEMO_PILOT_ID } from 'shared';
import { createDb } from '../src/client.js';
import { getOpenThumperRunForPilot } from '../src/queries/thumperRuns.js';
import { thumperRuns } from '../src/schema/thumperRuns.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is required (set in packages/db/.env)');
	process.exit(1);
}

const db = createDb(databaseUrl);

const open = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);
if (!open) {
	console.log(`No open thumper run for ${DEMO_PILOT_ID} — nothing to clear.`);
	process.exit(0);
}

console.log('Clearing open run:', {
	id: open.id,
	runSeed: open.runSeed,
	targetResourceId: open.targetResourceId,
	deployedAt: open.deployedAt.toISOString()
});

const now = new Date();
await db
	.update(thumperRuns)
	.set({ claimedAt: now })
	.where(and(eq(thumperRuns.id, open.id), isNull(thumperRuns.claimedAt)));

const after = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);
if (after) {
	console.error('Reset failed — open run still present.');
	process.exit(1);
}

console.log(`Done. Run marked claimed at ${now.toISOString()}. Refresh the app.`);
