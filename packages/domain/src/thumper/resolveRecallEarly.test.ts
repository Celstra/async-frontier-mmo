import { describe, expect, it } from 'vitest';
import { generateTutorialEventWindows } from './tutorialEventWindows.js';
import {
	FIRST_SESSION_PROJECTED_RECOVERY,
	FIRST_SESSION_SCANNER_MINIMUM
} from './tutorialThumperRuns.js';
import { resolveThumperRunResult } from './resolveThumperRunResult.js';

import type { ThumperEventWindowSnapshot } from './resolveThumperRunResult.js';

const firstSessionWindows = generateTutorialEventWindows({
	targetResourceId: 'veyrith_copper',
	tutorialRun: 2
}).windows as ThumperEventWindowSnapshot[];

const runConfig = {
	targetResourceId: 'veyrith_copper' as const,
	projectedRecovery: FIRST_SESSION_PROJECTED_RECOVERY,
	recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM,
	appliedWear: 12
};

describe('Recall Early resolution', () => {
	it('recall after window 1 keeps window-1-secured recovery and skips window 2', () => {
		const result = resolveThumperRunResult({
			runConfig,
			eventWindows: firstSessionWindows,
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'recall_early' }
			],
		});

		expect(result.resolutionType).toBe('recalled');
		expect(result.recoveredQuantity).toBe(56);
		expect(result.forfeitedRecovery).toBe(57);
		expect(result.wasteQuantity).toBe(0);
		expect(result.explanation).toContain('Recall Early');
		expect(result.explanation).not.toContain('pump_strain');
	});

	it('never erases wear already taken', () => {
		const result = resolveThumperRunResult({
			runConfig: { ...runConfig, appliedWear: 18 },
			eventWindows: firstSessionWindows,
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'recall_early' }
			],
		});

		expect(result.appliedWear).toBe(18);
	});

	it('completed runs still resolve all windows with recovery floor', () => {
		const result = resolveThumperRunResult({
			runConfig,
			eventWindows: firstSessionWindows,
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'clear_pump_problem' }
			],
		});

		expect(result.resolutionType).toBe('completed');
		expect(result.recoveredQuantity).toBe(113);
		expect(result.forfeitedRecovery).toBe(0);
	});
});
