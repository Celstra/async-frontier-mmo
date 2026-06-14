import type { TutorialThumperRun } from './tutorialThumperRuns.js';

export const TUTORIAL_DEPLOY_FAMILY = 'structural_alloy' as const;
export const TUTORIAL_DEPLOY_RESOURCE_SLUG = 'keth_iron';

const BLOCKED_TUTORIAL_DEPLOY_SLUGS = new Set([
	'sorrel_vein_copper',
	'veyrith_copper',
	'glimmerfall_shard',
	'pale_ember_crystal'
]);

export function isTutorialDeployLockedStep(tutorialStep: string | null): boolean {
	return tutorialStep === 'first_deploy' || tutorialStep === 'second_deploy';
}

export type TutorialDeployTarget = {
	resourceInstanceId: string;
	depositSpotId: string;
	resourceSlug: string;
};

export type TutorialDeployValidation =
	| { allowed: true }
	| { allowed: false; reason: string };

export function validateTutorialDeployTarget(input: {
	tutorialStep: string | null;
	resourceSlug: string;
	resourceInstanceId: string;
	spotId: string;
	lockedTarget: TutorialDeployTarget | null;
}): TutorialDeployValidation {
	if (!isTutorialDeployLockedStep(input.tutorialStep)) {
		return { allowed: true };
	}

	if (input.resourceSlug !== TUTORIAL_DEPLOY_RESOURCE_SLUG) {
		if (BLOCKED_TUTORIAL_DEPLOY_SLUGS.has(input.resourceSlug)) {
			return {
				allowed: false,
				reason:
					'Tutorial deploy locked to Keth Iron structural haul — wrong resource family for rig trials.'
			};
		}
		return {
			allowed: false,
			reason: 'Tutorial deploy locked to Keth Iron structural haul.'
		};
	}

	if (!input.lockedTarget) {
		return {
			allowed: false,
			reason: 'Sample the locked Keth Iron waypoint before deploying.'
		};
	}

	if (
		input.resourceInstanceId !== input.lockedTarget.resourceInstanceId ||
		input.spotId !== input.lockedTarget.depositSpotId
	) {
		return {
			allowed: false,
			reason: 'Tutorial deploy must use the locked Keth Iron waypoint.'
		};
	}

	return { allowed: true };
}

export const TUTORIAL_DEPLOY_LOCKED_BANNER =
	'Tutorial deploy locked: Keth Iron structural haul.';

export const TUTORIAL_DEPLOY_LOCKED_REASON =
	'The first rig trials need structural stock. Run this Keth Iron waypoint before changing targets.';

export const TUTORIAL_SECOND_DEPLOY_LOCKED_LINE =
	'Second tutorial deploy must use the locked Keth Iron waypoint.';

/** Slice §6 — run 2 reuses the locked Keth waypoint after run 1 claim drain. */
export function tutorialDeployWaivesSpotExhaustion(tutorialRun: TutorialThumperRun | null): boolean {
	return tutorialRun === 2;
}
