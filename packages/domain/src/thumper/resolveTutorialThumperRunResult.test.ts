import { describe, expect, it } from 'vitest';
import { generateTutorialEventWindows } from './tutorialEventWindows.js';
import { resolveTutorialThumperRunResult } from './resolveTutorialThumperRunResult.js';
import type { ThumperEventWindowSnapshot } from './resolveThumperRunResult.js';
import { TUTORIAL_RUN_1_YIELD_FLOOR, TUTORIAL_RUN_2_YIELD } from '../tuning.js';

describe('resolveTutorialThumperRunResult', () => {
	it('run 2 resolves to the scripted 60u yield', () => {
		const windows = generateTutorialEventWindows({
			targetResourceId: 'sorrel_vein_copper',
			tutorialRun: 2
		}).windows as ThumperEventWindowSnapshot[];

		const result = resolveTutorialThumperRunResult({
			tutorialRun: 2,
			targetResourceId: 'sorrel_vein_copper',
			projectedRecovery: 90,
			eventWindows: windows,
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'clear_pump_problem' }
			]
		});

		expect(result.recoveredQuantity).toBe(TUTORIAL_RUN_2_YIELD);
	});

	it('run 1 applies the 25u yield floor after hull fail-safe prorata', () => {
		const windows = generateTutorialEventWindows({
			targetResourceId: 'sorrel_vein_copper',
			tutorialRun: 1
		}).windows as ThumperEventWindowSnapshot[];

		const result = resolveTutorialThumperRunResult({
			tutorialRun: 1,
			targetResourceId: 'sorrel_vein_copper',
			projectedRecovery: 113,
			eventWindows: windows,
			responses: [{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'hold' }]
		});

		expect(result.recoveredQuantity).toBeGreaterThanOrEqual(TUTORIAL_RUN_1_YIELD_FLOOR);
		expect(result.resolutionType).toBe('recalled');
	});
});
