import {
	claimThumperRun,
	createDb,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	insertThumperRun
} from '@async-frontier-mmo/db';
import {
	getRedMesaResource,
	RED_MESA_BLOOM_RESOURCES,
	surveyRedMesaFirstSession,
	type NamedResourceId,
	resolveThumperState
} from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID } from 'shared';
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

function parseTargetResourceId(value: FormDataEntryValue | null): NamedResourceId | null {
	if (typeof value !== 'string' || !(value in RED_MESA_BLOOM_RESOURCES)) {
		return null;
	}
	return value as NamedResourceId;
}

export const load: PageServerLoad = async () => {
	const survey = surveyRedMesaFirstSession();
	const run = await getOpenThumperRunForPilot(getDb(), DEMO_PILOT_ID);

	if (!run) {
		return { thumperDemo: null, loadedAt: null, survey, openRun: null };
	}

	const now = new Date();
	const thumperDemo = resolveThumperState({
		deployedAt: run.deployedAt,
		durationSeconds: run.durationSeconds,
		now
	});
	const target = getRedMesaResource(run.targetResourceId as NamedResourceId);

	return {
		thumperDemo,
		loadedAt: now.toISOString(),
		survey,
		openRun: {
			targetResourceId: run.targetResourceId,
			targetDisplayName: target.displayName
		}
	};
};

export const actions: Actions = {
	deploy: async ({ request }) => {
		const db = getDb();
		const open = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

		if (open) {
			return fail(400, { message: 'Demo pilot already has an open thumper' });
		}

		const formData = await request.formData();
		const targetResourceId = parseTargetResourceId(formData.get('targetResourceId'));
		if (!targetResourceId) {
			return fail(400, { message: 'Invalid or missing target resource' });
		}

		const deployedAt = new Date();
		const durationSeconds = 60;
		const now = new Date();

		await insertThumperRun(db, {
			pilotId: DEMO_PILOT_ID,
			targetResourceId,
			deployedAt,
			durationSeconds
		});

		const thumperDemo = resolveThumperState({
			deployedAt,
			durationSeconds,
			now
		});
		const target = getRedMesaResource(targetResourceId);

		return {
			thumperDemo,
			loadedAt: now.toISOString(),
			openRun: {
				targetResourceId,
				targetDisplayName: target.displayName
			}
		};
	},

	claim: async () => {
		const db = getDb();
		const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

		if (!run) {
			const latest = await getLatestThumperRunForPilot(db, DEMO_PILOT_ID);
			if (latest?.claimedAt) {
				return { thumperDemo: null, claimed: true };
			}
			return fail(400, { message: 'No thumper to claim' });
		}

		const thumperDemo = resolveThumperState({
			deployedAt: run.deployedAt,
			durationSeconds: run.durationSeconds,
			now: new Date()
		});

		if (thumperDemo.status !== 'claimable') {
			return fail(400, { message: 'Thumper is not claimable yet', thumperDemo });
		}

		await claimThumperRun(db, run.id);

		return { thumperDemo: null, claimed: true };
	}
};
