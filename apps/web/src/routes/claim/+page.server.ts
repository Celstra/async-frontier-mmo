import {
	getBloomRecord,
	getDepositSpotYieldState,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getResourceInstanceById,
	getThumperRunResultForRun,
	parseDepositSpotDrainAdjustment
} from '@async-frontier-mmo/db';
import { dev } from '$app/environment';
import { fail, redirect } from '@sveltejs/kit';
import { claimOpenRun } from '$lib/server/claimWorkflow';
import { loadClaimScreen } from '$lib/server/claimLoad';
import {
	trackResourceClaimed,
	trackThumperClaimed
} from '$lib/server/playtestTelemetry';
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

	const state = await augmentClaimScreenWithDepositSpot(db, pilotId, await loadClaimScreen(db, pilotId, new Date()));
	if (state.mode === 'none') {
		redirect(303, '/');
	}

	return {
		...state,
		showDevAudit: dev
	};
};

async function augmentClaimScreenWithDepositSpot(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	state: Awaited<ReturnType<typeof loadClaimScreen>>
) {
	if (state.mode !== 'result') {
		return state;
	}

	const run = await getLatestThumperRunForPilot(db, pilotId);
	if (!run?.depositSpotId || !run.resourceInstanceId) {
		return state;
	}

	const resourceInstance = await getResourceInstanceById(db, run.resourceInstanceId);
	if (!resourceInstance) {
		return state;
	}

	const bloom = await getBloomRecord(db, resourceInstance.bloomId);
	const generationSeed = bloom?.generationSeed ?? `red-mesa-bloom-${resourceInstance.bloomId}`;
	const spotYield = await getDepositSpotYieldState(db, {
		spotId: run.depositSpotId,
		resourceInstanceId: run.resourceInstanceId,
		generationSeed
	});

	const drainLine = parseDepositSpotDrainAdjustment(state.claimResult.explanation);
	const payoutAdjustments = drainLine
		? [...state.explanation.payoutAdjustments, drainLine]
		: state.explanation.payoutAdjustments;

	return {
		...state,
		explanation: {
			...state.explanation,
			payoutAdjustments
		},
		depositSpotExhausted: spotYield.remainingUnits <= 0
	};
}

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
			if (outcome.status === 'claimed') {
				const latest = await getLatestThumperRunForPilot(db, pilotId);
				if (latest && outcome.claimResult) {
					await trackThumperClaimed(db, pilotId, {
						thumperRunId: latest.id,
						recoveredQuantity: outcome.claimResult.recoveredQuantity
					});
				}
				if (outcome.reward) {
					await trackResourceClaimed(db, pilotId, {
						resourceSlug: outcome.reward.resourceSlug,
						resourceInstanceId: outcome.reward.resourceInstanceId,
						quantityGranted: outcome.reward.quantityGranted
					});
				}
			}
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
