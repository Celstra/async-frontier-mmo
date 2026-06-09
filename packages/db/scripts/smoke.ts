import { createDb, getLatestThumperEvent, insertThumperEvent } from '../src/index.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
	console.error('DATABASE_URL is required (set in packages/db/.env)');
	process.exit(1);
}

const db = createDb(databaseUrl);

const inserted = await insertThumperEvent(db, {
	deployedAt: new Date(),
	durationSeconds: 60
});
const latest = await getLatestThumperEvent(db);

console.log({ inserted, latest });
process.exit(0);
