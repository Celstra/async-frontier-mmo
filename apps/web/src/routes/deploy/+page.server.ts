import {
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
	EXTRACTION_TAIL_OPTIONS,
	generateThumperEventWindows,
	isTutorialThumperDeploy,
	parseExtractionTailMinutes,
	TUTORIAL_RUN_SEED,
	type NamedResourceId
} from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';
import { loadDeployPreviewForPilot } from '$lib/server/deployLoad';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { recommendedResourceSlugForBloom, surveyTeachingNote } from '$lib/surveyScreen';
import {
	trackDeployScreenViewed,
	trackThumperDeployed
} from '$lib/server/playtestTelemetry';
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
	const selectedTailId = event.url.searchParams.get('tail') ?? '1h';
	const extractionTailMinutes = parseExtractionTailMinutes(selectedTailId);
	const previewPushRun = event.url.searchParams.get('push') === 'true';

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
	const isTutorialRun = isTutorialThumperDeploy({
		targetResourceId: resource.resourceSlug as NamedResourceId,
		hasCompletedTutorial
	});
	const isPushRun = !isTutorialRun && previewPushRun;
	const recommendedResourceSlug = recommendedResourceSlugForBloom(resource.bloomId, hasCompletedTutorial);

	const { equippedParts, preview } = await loadDeployPreviewForPilot(db, {
		pilotId,
		trueConcentrationPercent: sample.trueConcentrationPercent,
		extractionTailMinutes,
		isPushRun,
		isTutorialRun
	});

	await trackDeployScreenViewed(db, pilotId, {
		resourceSlug: resource.resourceSlug,
		resourceInstanceId,
		spotId,
		extractionTailMinutes
	});

	return {
		resourceInstanceId,
		spotId,
		displayName: resource.displayName,
		resourceSlug: resource.resourceSlug,
		recommended: resource.resourceSlug === recommendedResourceSlug,
		teachingNote: surveyTeachingNote(resource.resourceSlug),
		trueConcentrationPercent: sample.trueConcentrationPercent,
		hasCompletedTutorial,
		isTutorialRun,
		showPushRunToggle: !isTutorialRun,
		selectedTailId,
		selectedPushRun: isPushRun,
		extractionTailOptions: EXTRACTION_TAIL_OPTIONS,
		equippedParts,
		preview
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
		const extractionTailMinutes = parseExtractionTailMinutes(
			formData.get('extractionTail')?.toString()
		);

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

		const { preview } = await loadDeployPreviewForPilot(db, {
			pilotId,
			trueConcentrationPercent: sample.trueConcentrationPercent,
			extractionTailMinutes,
			isPushRun,
			isTutorialRun
		});

		const pilotFrame = await getPilotFrame(db, pilotId);
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
			durationSeconds: preview.totalDurationSeconds,
			depositSpotId: spotId,
			trueConcentrationPercent: sample.trueConcentrationPercent,
			extractionTailMinutes,
			resourceInstanceId,
			windows: plan.windows.map((window) => ({
				windowIndex: window.windowIndex,
				complication: window.complication,
				matchingAction: window.matchingAction
			}))
		});

		await trackThumperDeployed(db, pilotId, {
			targetResourceId,
			isTutorialRun,
			extractionTailMinutes
		});

		redirect(303, '/');
	}
};
