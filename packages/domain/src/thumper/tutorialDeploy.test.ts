import { describe, expect, it } from 'vitest';
import {
	TUTORIAL_DEPLOY_RESOURCE_SLUG,
	tutorialDeployWaivesSpotExhaustion,
	validateTutorialDeployTarget
} from './tutorialDeploy.js';

const locked = {
	resourceInstanceId: 'keth-instance',
	depositSpotId: 'keth-spot',
	resourceSlug: TUTORIAL_DEPLOY_RESOURCE_SLUG
};

describe('validateTutorialDeployTarget', () => {
	it('accepts locked Keth waypoint on first deploy', () => {
		expect(
			validateTutorialDeployTarget({
				tutorialStep: 'first_deploy',
				resourceSlug: TUTORIAL_DEPLOY_RESOURCE_SLUG,
				resourceInstanceId: locked.resourceInstanceId,
				spotId: locked.depositSpotId,
				lockedTarget: locked
			})
		).toEqual({ allowed: true });
	});

	it('rejects Sorrel on first deploy', () => {
		const result = validateTutorialDeployTarget({
			tutorialStep: 'first_deploy',
			resourceSlug: 'sorrel_vein_copper',
			resourceInstanceId: 'sorrel',
			spotId: 'sorrel-spot',
			lockedTarget: locked
		});
		expect(result.allowed).toBe(false);
	});

	it('rejects non-Keth waypoint even when slug matches', () => {
		const result = validateTutorialDeployTarget({
			tutorialStep: 'second_deploy',
			resourceSlug: TUTORIAL_DEPLOY_RESOURCE_SLUG,
			resourceInstanceId: 'other-keth',
			spotId: 'wrong-spot',
			lockedTarget: locked
		});
		expect(result.allowed).toBe(false);
	});

	it('allows async deploy after tutorial lock steps', () => {
		expect(
			validateTutorialDeployTarget({
				tutorialStep: 'async_reveal',
				resourceSlug: 'glimmerfall_shard',
				resourceInstanceId: 'rc',
				spotId: 'rc-spot',
				lockedTarget: locked
			})
		).toEqual({ allowed: true });
	});
});

describe('tutorialDeployWaivesSpotExhaustion', () => {
	it('waives exhaustion only for scripted run 2', () => {
		expect(tutorialDeployWaivesSpotExhaustion(1)).toBe(false);
		expect(tutorialDeployWaivesSpotExhaustion(2)).toBe(true);
		expect(tutorialDeployWaivesSpotExhaustion(null)).toBe(false);
	});
});
