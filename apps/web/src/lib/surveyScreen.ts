import type { ResourceFamily } from '@async-frontier-mmo/domain';

export const SURVEY_FAMILY_OPTIONS: ReadonlyArray<{
	id: ResourceFamily;
	label: string;
}> = [
	{ id: 'conductive_metal', label: 'Conductive Metal' },
	{ id: 'structural_alloy', label: 'Structural Alloy' },
	{ id: 'reactive_crystal', label: 'Reactive Crystal' }
];

export const TUTORIAL_SURVEY_FAMILY: ResourceFamily = 'conductive_metal';
export const TUTORIAL_RECOMMENDED_RESOURCE_SLUG = 'veyrith_copper';

export function parseSurveyFamily(value: string | null): ResourceFamily {
	const match = SURVEY_FAMILY_OPTIONS.find((option) => option.id === value);
	return match?.id ?? TUTORIAL_SURVEY_FAMILY;
}

export function recommendedResourceSlugForBloom(
	activeBloomId: number,
	hasCompletedTutorial: boolean
): string | null {
	if (activeBloomId === 1 && !hasCompletedTutorial) {
		return TUTORIAL_RECOMMENDED_RESOURCE_SLUG;
	}
	return null;
}

export function surveyTeachingNote(resourceSlug: string): string | null {
	if (resourceSlug === 'veyrith_copper') {
		return 'High Conductivity find — recommended first thump target, not required.';
	}
	if (resourceSlug === 'red_mesa_conductive_slag') {
		return 'Safe conductive baseline — lower ceiling than Veyrith.';
	}
	if (resourceSlug === 'sorrel_vein_copper') {
		return 'Flexible malleable copper — compare before you commit.';
	}
	return null;
}
