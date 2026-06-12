import {
	getActiveBloomId,
	getResourceInstanceById,
	hasPilotCompletedTutorialThumper,
	sampleSpotForPilot,
	scanFamilyForPilot
} from '@async-frontier-mmo/db';
import type { ResourceFamily } from '@async-frontier-mmo/domain';
import { TUTORIAL_RUN_SEED } from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { loadSurveyScreenData } from '$lib/server/surveyLoad';
import { parseSurveyFamily, recommendedResourceSlugForBloom } from '$lib/surveyScreen';
import {
	trackFamilyScanCompleted,
	trackSampleSpotCompleted
} from '$lib/server/playtestTelemetry';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const gate = await requireFrameChosenPilot(db, pilotId);
	if (gate) {
		redirect(303, '/');
	}

	const selectedFamily = parseSurveyFamily(event.url.searchParams.get('family'));

	return loadSurveyScreenData(db, pilotId, selectedFamily);
};

export const actions: Actions = {
	scanFamily: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const family = parseSurveyFamily(formData.get('family')?.toString() ?? null);

		const outcome = await scanFamilyForPilot(db, { pilotId, family: family as ResourceFamily });
		if (outcome.status === 'insufficient_energy') {
			return fail(400, {
				message: 'Not enough survey energy for a family scan',
				...(await loadSurveyScreenData(db, pilotId, family))
			});
		}

		const activeBloomId = await getActiveBloomId(db);
		const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
			db,
			pilotId,
			TUTORIAL_RUN_SEED
		);
		await trackFamilyScanCompleted(db, pilotId, {
			family,
			resourceCount: outcome.resources.length,
			recommendedResourceSlug: recommendedResourceSlugForBloom(
				activeBloomId,
				hasCompletedTutorial
			)
		});

		return loadSurveyScreenData(db, pilotId, family);
	},

	sampleSpot: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const family = parseSurveyFamily(formData.get('family')?.toString() ?? null);
		const resourceInstanceId = formData.get('resourceInstanceId');
		const spotId = formData.get('spotId');

		if (typeof resourceInstanceId !== 'string' || typeof spotId !== 'string') {
			return fail(400, {
				message: 'Missing deposit spot',
				...(await loadSurveyScreenData(db, pilotId, family))
			});
		}

		const outcome = await sampleSpotForPilot(db, {
			pilotId,
			resourceInstanceId,
			spotId
		});

		if (outcome.status !== 'ok') {
			const messages: Record<typeof outcome.status, string> = {
				insufficient_energy: 'Not enough survey energy to sample this spot',
				family_scan_required: 'Scan this resource family before sampling deposit spots',
				spot_already_sampled: 'You already sampled this deposit spot',
				spot_not_found: 'That deposit signal has faded — scan for fresh spots.',
				spot_resource_mismatch: 'Spot does not belong to this resource',
				resource_not_found: 'Resource not found in this bloom'
			};
			return fail(400, {
				message: messages[outcome.status],
				sampleOutcome: outcome,
				...(await loadSurveyScreenData(db, pilotId, family))
			});
		}

		const resource = await getResourceInstanceById(db, resourceInstanceId);
		await trackSampleSpotCompleted(db, pilotId, {
			resourceSlug: resource?.resourceSlug ?? 'unknown',
			statsRevealedThisSample: outcome.statsRevealedThisSample
		});

		return {
			sampleOutcome: {
				...outcome,
				displayName: resource?.displayName
			},
			...(await loadSurveyScreenData(db, pilotId, family))
		};
	}
};
