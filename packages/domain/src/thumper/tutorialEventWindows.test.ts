import { describe, expect, it } from 'vitest';
import { generateTutorialEventWindows } from './tutorialEventWindows.js';

describe('generateTutorialEventWindows', () => {
	it('run 1 fires only Signal Drift', () => {
		const plan = generateTutorialEventWindows({
			targetResourceId: 'sorrel_vein_copper',
			tutorialRun: 1
		});

		expect(plan.windows).toHaveLength(1);
		expect(plan.windows[0]).toMatchObject({
			windowIndex: 1,
			quiet: false,
			complication: 'signal_drift',
			matchingAction: 'signal_tune'
		});
	});

	it('run 2 fires Signal Drift then Pump Strain', () => {
		const plan = generateTutorialEventWindows({
			targetResourceId: 'sorrel_vein_copper',
			tutorialRun: 2
		});

		expect(plan.windows).toHaveLength(2);
		expect(
			plan.windows
				.filter((window) => !window.quiet)
				.map((window) => window.complication)
		).toEqual(['signal_drift', 'pump_strain']);
	});

	it('includes recall_early as a safety choice', () => {
		const plan = generateTutorialEventWindows({
			targetResourceId: 'veyrith_copper',
			tutorialRun: 2
		});

		expect(plan.safetyChoices).toEqual(['recall_early']);
		expect(plan.eventActions).not.toContain('recall_early');
	});
});
