import {
	BLOOM_ONE_ID,
	getActiveBloomId,
	getEquippedScannerForPilot,
	hasPilotCompletedTutorialThumper,
	hasPilotFamilyScan,
	previewFamilyScanForPilot,
	getPilotProspectingProgress
} from '@async-frontier-mmo/db';
import {
	SURVEY_ENERGY_CAP,
	surveyEnergyOutlook,
	TUTORIAL_RUN_SEED,
	type ResourceFamily
} from '@async-frontier-mmo/domain';
import { activeBloomDisplayName } from '$lib/pilotHome';
import {
	recommendedResourceSlugForBloom,
	SURVEY_FAMILY_OPTIONS,
	surveyTeachingNote
} from '$lib/surveyScreen';
import type { getGameDb } from './gameDb.js';

function enrichSurveyResources(
	resources: Awaited<ReturnType<typeof previewFamilyScanForPilot>>['resources']
) {
	return resources.map((resource) => ({
		...resource,
		teachingNote: surveyTeachingNote(resource.resourceSlug)
	}));
}

export async function loadSurveyScreenData(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	selectedFamily: ResourceFamily
) {
	const activeBloomId = await getActiveBloomId(db);
	const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
		db,
		pilotId,
		TUTORIAL_RUN_SEED
	);
	const recommendedResourceSlug = recommendedResourceSlugForBloom(
		activeBloomId,
		hasCompletedTutorial
	);
	const hasFamilyScan = await hasPilotFamilyScan(db, {
		pilotId,
		bloomId: activeBloomId,
		family: selectedFamily
	});
	const now = new Date();
	const prospectingProgress = await getPilotProspectingProgress(db, pilotId, now, activeBloomId);
	const surveyEnergyOutlookData = surveyEnergyOutlook({
		storedEnergy: prospectingProgress.surveyEnergy,
		lastUpdatedAtMs: prospectingProgress.lastEnergyUpdatedAtMs,
		nowMs: now.getTime()
	});

	const preview = hasFamilyScan
		? await previewFamilyScanForPilot(db, {
				pilotId,
				family: selectedFamily,
				recommendedResourceSlug
			})
		: null;

	const equippedScanner = await getEquippedScannerForPilot(db, pilotId);
	const surveyClarityScore = equippedScanner?.propertyScores.survey_clarity ?? 0;

	return {
		regionId: 'red_mesa' as const,
		activeBloomId: preview?.activeBloomId ?? activeBloomId,
		activeBloomName: activeBloomDisplayName(preview?.activeBloomId ?? activeBloomId),
		hasCompletedTutorial,
		isTutorialSurvey: activeBloomId === BLOOM_ONE_ID && !hasCompletedTutorial,
		selectedFamily,
		familyOptions: SURVEY_FAMILY_OPTIONS,
		recommendedResourceSlug,
		hasFamilyScan,
		surveyEnergy: preview?.surveyEnergy ?? prospectingProgress.surveyEnergy,
		surveyEnergyCap: SURVEY_ENERGY_CAP,
		surveyEnergyOutlook: surveyEnergyOutlookData,
		equippedScanner: equippedScanner
			? {
					displayName: equippedScanner.displayName,
					surveyClarityScore
				}
			: null,
		resources: preview ? enrichSurveyResources(preview.resources) : []
	};
}
