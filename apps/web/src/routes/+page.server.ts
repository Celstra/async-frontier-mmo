import {
	claimThumperEvent,
	createDb,
	getLatestThumperEvent,
	insertThumperEvent
} from '@async-frontier-mmo/db';
import { resolveThumperState } from '@async-frontier-mmo/domain';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

function getDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'DATABASE_URL is not configured');
	}
	return createDb(databaseUrl);
}

export const load: PageServerLoad = async () => {
	const event = await getLatestThumperEvent(getDb());

	if (!event || event.claimedAt) {
		return { thumperDemo: null, loadedAt: null };
	}

	const now = new Date();
	const thumperDemo = resolveThumperState({
		deployedAt: event.deployedAt,
		durationSeconds: event.durationSeconds,
		now
	});

	return { thumperDemo, loadedAt: now.toISOString() };
};

export const actions: Actions = {
	deploy: async () => {
		const deployedAt = new Date();
		const durationSeconds = 60;
		const now = new Date();

		await insertThumperEvent(getDb(), { deployedAt, durationSeconds });

		const thumperDemo = resolveThumperState({
			deployedAt,
			durationSeconds,
			now
		});

		return { thumperDemo, loadedAt: now.toISOString() };
	},

	claim: async () => {
		const db = getDb();
		const event = await getLatestThumperEvent(db);

		if (!event || event.claimedAt) {
			return fail(400, { message: 'No thumper to claim' });
		}

		const thumperDemo = resolveThumperState({
			deployedAt: event.deployedAt,
			durationSeconds: event.durationSeconds,
			now: new Date()
		});

		if (thumperDemo.status !== 'claimable') {
			return fail(400, { message: 'Thumper is not claimable yet', thumperDemo });
		}

		await claimThumperEvent(db, event.id);

		return { thumperDemo: null, claimed: true };
	}
};
