import {
	BLOOM_ONE_ID,
	getActiveBloomId,
	getEquippedScannerForPilot,
	hasPilotCompletedTutorialThumper,
	pilotNeedsFrameChoice,
	previewFamilyScanForPilot
} from '@async-frontier-mmo/db';
import { TUTORIAL_RUN_SEED } from '@async-frontier-mmo/domain';
import type { ResourceFamily } from '@async-frontier-mmo/domain';
import { activeBloomDisplayName } from '$lib/pilotHome';
import {
	recommendedResourceSlugForBloom,
	SURVEY_FAMILY_OPTIONS,
	surveyTeachingNote
} from '$lib/surveyScreen';
import type { getGameDb } from './gameDb.js';

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
	const preview = await previewFamilyScanForPilot(db, {
		pilotId,
		family: selectedFamily,
		recommendedResourceSlug
	});
	const equippedScanner = await getEquippedScannerForPilot(db, pilotId);
	const surveyClarityScore = equippedScanner?.propertyScores.survey_clarity ?? 0;

	return {
		regionId: 'red_mesa' as const,
		activeBloomId: preview.activeBloomId,
		activeBloomName: activeBloomDisplayName(preview.activeBloomId),
		hasCompletedTutorial,
		isTutorialSurvey: activeBloomId === BLOOM_ONE_ID && !hasCompletedTutorial,
		selectedFamily,
		familyOptions: SURVEY_FAMILY_OPTIONS,
		recommendedResourceSlug,
		surveyEnergy: preview.surveyEnergy,
		equippedScanner: equippedScanner
			? {
					displayName: equippedScanner.displayName,
					surveyClarityScore
				}
			: null,
		resources: preview.resources.map((resource) => ({
			...resource,
			teachingNote: surveyTeachingNote(resource.resourceSlug)
		}))
	};
}

export { pilotNeedsFrameChoice };
