import { describe, expect, it } from 'vitest';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
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
		const severities = plan.windows.map((window) => window.severity);
		expect(severities.every((severity) => severity === 'minor' || severity === 'serious')).toBe(
			true
		);
	});

	it('tutorial first-session windows are always minor', () => {
		const plan = generateFirstSessionEventWindows({ targetResourceId: 'veyrith_copper' });
		expect(plan.windows.every((window) => window.severity === 'minor')).toBe(true);
	});
});
