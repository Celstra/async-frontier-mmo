/** Persistence layer — Drizzle schema and queries. */
export { createDb, type Db } from './client.js';
export {
	claimThumperEvent,
	getLatestThumperEvent,
	insertThumperEvent
} from './queries/thumperEvents.js';
export { thumperEvents } from './schema/thumperEvents.js';
