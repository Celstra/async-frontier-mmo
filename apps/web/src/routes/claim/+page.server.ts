import {
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getThumperRunResultForRun
} from '@async-frontier-mmo/db';
import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { claimOpenRun } from '$lib/server/claimWorkflow';
import { loadClaimScreen } from '$lib/server/claimLoad';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const gate = await requireFrameChosenPilot(db, pilotId);
	if (gate) {
		redirect(303, '/');
	}

	const state = await loadClaimScreen(db, pilotId, new Date());
	if (state.mode === 'none') {
		redirect(303, '/');
	}

	return {
		...state,
		showDevAudit: dev
	};
};

export const actions: Actions = {
	claim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const gate = await requireFrameChosenPilot(db, pilotId);
		if (gate) return gate;

		const now = new Date();
		let outcome;
		try {
			outcome = await claimOpenRun(db, pilotId, now);
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Claim failed unexpectedly'
			});
		}

		if (
			outcome.status === 'claimed' ||
			outcome.status === 'already_claimed'
		) {
			redirect(303, '/claim');
		}

		if (outcome.status === 'not_claimable') {
			return fail(400, { message: 'Thumper is not claimable yet' });
		}

		if (outcome.status === 'not_resolvable') {
			return fail(400, { message: outcome.message });
		}

		if (outcome.status === 'invalid_windows') {
			return fail(400, { message: outcome.message });
		}

		const latest = await getLatestThumperRunForPilot(db, pilotId);
		if (latest?.claimedAt) {
			redirect(303, '/claim');
		}

		const openRun = await getOpenThumperRunForPilot(db, pilotId);
		if (!openRun) {
			const result = latest ? await getThumperRunResultForRun(db, latest.id) : null;
			if (result) {
				redirect(303, '/claim');
			}
		}

		return fail(400, { message: 'No thumper to claim' });
	}
};
