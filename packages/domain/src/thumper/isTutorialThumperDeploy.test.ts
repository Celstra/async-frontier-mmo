import { describe, expect, it } from 'vitest';
import { isTutorialThumperDeploy } from './isTutorialThumperDeploy.js';

describe('isTutorialThumperDeploy', () => {
	it('first Veyrith deploy is tutorial', () => {
		expect(
			isTutorialThumperDeploy({
				targetResourceId: 'veyrith_copper',
				hasCompletedTutorial: false
			})
		).toBe(true);
	});

	it('repeat Veyrith deploy uses seeded generation', () => {
		expect(
			isTutorialThumperDeploy({
				targetResourceId: 'veyrith_copper',
				hasCompletedTutorial: true
			})
		).toBe(false);
	});

	it('non-Veyrith deploy is never the scripted tutorial', () => {
		expect(
			isTutorialThumperDeploy({
				targetResourceId: 'keth_iron',
				hasCompletedTutorial: false
			})
		).toBe(false);
	});
});
