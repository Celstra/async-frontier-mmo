import { createDb } from '@async-frontier-mmo/db';
import { error } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';

export function getGameDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'DATABASE_URL is not configured');
	}
	return createDb(databaseUrl);
}
