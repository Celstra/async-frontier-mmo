import type { ResourceFamily } from '@async-frontier-mmo/domain';

export const FIELD_FAMILY_OPTIONS: ReadonlyArray<{
	id: ResourceFamily;
	label: string;
}> = [
	{ id: 'conductive_metal', label: 'Conductive Metal' },
	{ id: 'structural_alloy', label: 'Structural Alloy' },
	{ id: 'reactive_crystal', label: 'Reactive Crystal' }
];

export const DEFAULT_FIELD_FAMILY: ResourceFamily = 'conductive_metal';
export const THUMP_TARGET_RESOURCE_SLUG = 'veyrith_copper';

const HAND_FILLABLE_SLUG_BY_FAMILY: Partial<Record<ResourceFamily, string>> = {
	structural_alloy: 'keth_iron',
	conductive_metal: 'sorrel_vein_copper',
	reactive_crystal: 'pale_ember_crystal'
};

export function parseFieldFamily(value: string | null): ResourceFamily {
	const match = FIELD_FAMILY_OPTIONS.find((option) => option.id === value);
	return match?.id ?? DEFAULT_FIELD_FAMILY;
}

/** Tutorial-only [RECOMMENDED] tag — points at the hand-fillable resource for the pinned order. */
export function tutorialRecommendResourceSlug(input: {
	hasCompletedTutorial: boolean;
	tutorialStep: string | null;
	activeOrderFamily: ResourceFamily | null;
}): string | null {
	if (input.hasCompletedTutorial || input.tutorialStep === 'done') {
		return null;
	}

	if (!input.activeOrderFamily) {
		return null;
	}

	return HAND_FILLABLE_SLUG_BY_FAMILY[input.activeOrderFamily] ?? null;
}

export const FIELD_MODE_LINE =
	'Hand-sample tops up foreman orders (small lots, survey energy). Deploy the thumper for bulk hull materials.';

export const SAME_WAYPOINT_DEPLOY_HINT =
	'Second tutorial run uses your first waypoint — same deposit, no new scouting.';
