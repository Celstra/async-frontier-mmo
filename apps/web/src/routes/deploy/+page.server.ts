import {
	countFieldRepairKitsForPilot,
	deployThumperRunWithEventWindows,
	getActiveBloomId,
	getOpenThumperRunForPilot,
	getPilotDepositSample,
	getPilotFrame,
	getResourceInstanceByBloomSlug,
	getResourceInstanceById,
	hasPilotCompletedTutorialThumper
} from '@async-frontier-mmo/db';
import {
	concentrationPercentToExtractionMultiplier,
	DEFAULT_PROJECTED_RECOVERY,
	generateThumperEventWindows,
	isTutorialThumperDeploy,
	TUTORIAL_RUN_SEED,
	type NamedResourceId
} from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { recommendedResourceSlugForBloom, surveyTeachingNote } from '$lib/surveyScreen';
import type { Actions, PageServerLoad } from './$types';

async function resolveDeployTargetSlug(
	db: ReturnType<typeof getGameDb>,
	value: FormDataEntryValue | null
): Promise<string | null> {
	if (typeof value !== 'string' || value.length === 0) {
		return null;
	}

	const activeBloomId = await getActiveBloomId(db);
	const instance = await getResourceInstanceByBloomSlug(db, activeBloomId, value);
	if (!instance || instance.extinctAt) {
		return null;
	}

	return value;
}

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const resourceInstanceId = event.url.searchParams.get('resourceInstanceId');
	const spotId = event.url.searchParams.get('spotId');

	if (!resourceInstanceId || !spotId) {
		redirect(303, '/survey');
	}

	const sample = await getPilotDepositSample(db, {
		pilotId,
		resourceInstanceId,
		spotId
	});

	if (!sample) {
		redirect(303, '/survey');
	}

	const resource = await getResourceInstanceById(db, resourceInstanceId);
	if (!resource) {
		redirect(303, '/survey');
	}

	const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
		db,
		pilotId,
		TUTORIAL_RUN_SEED
	);
	const recommendedResourceSlug = recommendedResourceSlugForBloom(resource.bloomId, hasCompletedTutorial);
	const extractionMultiplier = concentrationPercentToExtractionMultiplier(
		sample.trueConcentrationPercent
	);
	const projectedRecovery = Math.round(DEFAULT_PROJECTED_RECOVERY * extractionMultiplier);

	return {
		resourceInstanceId,
		spotId,
		displayName: resource.displayName,
		resourceSlug: resource.resourceSlug,
		recommended: resource.resourceSlug === recommendedResourceSlug,
		teachingNote: surveyTeachingNote(resource.resourceSlug),
		trueConcentrationPercent: sample.trueConcentrationPercent,
		extractionMultiplier,
		projectedRecovery
	};
};

export const actions: Actions = {
	deploy: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const open = await getOpenThumperRunForPilot(db, pilotId);
		if (open) {
			return fail(400, { message: 'You already have an open thumper run' });
		}

		const formData = await event.request.formData();
		const targetResourceId = await resolveDeployTargetSlug(db, formData.get('targetResourceId'));
		const resourceInstanceId = formData.get('resourceInstanceId');
		const spotId = formData.get('spotId');

		if (!targetResourceId || typeof resourceInstanceId !== 'string' || typeof spotId !== 'string') {
			return fail(400, { message: 'Invalid deploy target' });
		}

		const sample = await getPilotDepositSample(db, {
			pilotId,
			resourceInstanceId,
			spotId
		});

		if (!sample) {
			return fail(400, { message: 'Sample this deposit spot on Survey before deploying' });
		}

		const pilotFrame = await getPilotFrame(db, pilotId);
		const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
			db,
			pilotId,
			TUTORIAL_RUN_SEED
		);
		const isTutorialRun = isTutorialThumperDeploy({
			targetResourceId: targetResourceId as NamedResourceId,
			hasCompletedTutorial
		});
		const isPushRun = !isTutorialRun && formData.get('isPushRun') === 'true';
		const runSeed = isTutorialRun ? TUTORIAL_RUN_SEED : crypto.randomUUID();
		const plan = generateThumperEventWindows({
			targetResourceId: targetResourceId as NamedResourceId,
			runSeed,
			isPushRun,
			isTutorialRun
		});

		await deployThumperRunWithEventWindows(db, {
			pilotId,
			pilotFrameId: pilotFrame,
			targetResourceId,
			runSeed: plan.runSeed,
			isPushRun: plan.isPushRun,
			deployedAt: new Date(),
			durationSeconds: 60,
			windows: plan.windows.map((window) => ({
				windowIndex: window.windowIndex,
				complication: window.complication,
				matchingAction: window.matchingAction
			}))
		});

		await countFieldRepairKitsForPilot(db, pilotId);
		redirect(303, '/');
	}
};
