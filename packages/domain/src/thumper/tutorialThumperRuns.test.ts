import { describe, expect, it } from 'vitest';
import {
	tutorialDeployForStep,
	tutorialRunFromSeed,
	tutorialRunSeed
} from './tutorialThumperRuns.js';

describe('tutorialThumperRuns', () => {
	it('maps tutorial steps to deploy runs', () => {
		expect(tutorialDeployForStep('first_deploy')).toBe(1);
		expect(tutorialDeployForStep('second_deploy')).toBe(2);
		expect(tutorialDeployForStep('hunting')).toBeNull();
	});

	it('round-trips run seeds', () => {
		expect(tutorialRunFromSeed(tutorialRunSeed(1))).toBe(1);
		expect(tutorialRunFromSeed(tutorialRunSeed(2))).toBe(2);
	});
});
