import { describe, expect, it } from 'vitest';
import { generateTutorialEventWindows } from './tutorialEventWindows.js';
import { generateSeededThumperEventWindows } from './generateSeededThumperEventWindows.js';
import { rollEventWindowSeverity } from './eventWindowSeverity.js';

describe('rollEventWindowSeverity', () => {
	it('same seed and window index always roll the same severity', () => {
		const first = rollEventWindowSeverity({ runSeed: 'stable-seed', windowIndex: 2 });
		const second = rollEventWindowSeverity({ runSeed: 'stable-seed', windowIndex: 2 });
		expect(second).toBe(first);
	});

	it('different window indices on the same run can differ', () => {
		const plan = generateSeededThumperEventWindows({
			runSeed: 'severity-mix-check',
			targetResourceId: 'keth_iron',
			isPushRun: true
		});
		// Filter for event windows only (quiet windows have no severity)
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		const severities = eventWindows.map((window) =>
			'severity' in window ? window.severity : 'minor'
		);
		expect(severities.every((severity) => severity === 'minor' || severity === 'serious')).toBe(
			true
		);
	});

	it('tutorial first-session windows are always minor', () => {
		const plan = generateTutorialEventWindows({
			targetResourceId: 'veyrith_copper',
			tutorialRun: 2
		});
		// Tutorial has no quiet windows
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		expect(eventWindows.every((window) => 'severity' in window && window.severity === 'minor')).toBe(true);
	});
});
