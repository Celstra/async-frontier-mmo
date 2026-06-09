import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

export function createDb(databaseUrl: string) {
	const client = postgres(databaseUrl);
	return drizzle(client);
}

export type Db = ReturnType<typeof createDb>;
