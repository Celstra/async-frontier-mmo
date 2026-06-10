import { createDb, type Db } from '@async-frontier-mmo/db';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

// One pool per process: createDb opens a postgres.js connection pool that is
// never closed, so calling it per request exhausts Postgres max_connections.
// Cached on globalThis so Vite HMR module reloads reuse the same pool in dev.
type DbCache = { db: Db; url: string };
const globalCache = globalThis as typeof globalThis & { __gameDbCache?: DbCache };

export function getGameDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'DATABASE_URL is not configured');
	}
	if (globalCache.__gameDbCache?.url !== databaseUrl) {
		globalCache.__gameDbCache = { db: createDb(databaseUrl), url: databaseUrl };
	}
	return globalCache.__gameDbCache.db;
}
