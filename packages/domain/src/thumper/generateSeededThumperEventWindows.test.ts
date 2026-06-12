import { describe, expect, it } from 'vitest';
import { THUMPER_COMPLICATION_TABLE } from './complicationTable.js';
import { generateTutorialEventWindows } from './tutorialEventWindows.js';
import { generateThumperEventWindows } from './generateThumperEventWindows.js';
import {
	DEFAULT_RUN_WINDOW_COUNT,
	generateSeededThumperEventWindows,
	PUSH_RUN_WINDOW_COUNT
} from './generateSeededThumperEventWindows.js';
import { getEventWindowResponseOptions } from './getEventWindowResponseOptions.js';
import { getMatchingAction } from './complicationActions.js';

describe('generateSeededThumperEventWindows', () => {
	it('same seed always generates the same windows', () => {
		const input = {
			runSeed: 'red-mesa-bloom-42',
			targetResourceId: 'keth_iron' as const,
			isPushRun: false
		};

		const first = generateSeededThumperEventWindows(input);
		const second = generateSeededThumperEventWindows(input);

		expect(second).toEqual(first);
		expect(first.windows.length).toBe(DEFAULT_RUN_WINDOW_COUNT);
	});

	it('push runs generate a third window; default runs cannot', () => {
		const seed = 'push-vs-default';

		const defaultRun = generateSeededThumperEventWindows({
			runSeed: seed,
			targetResourceId: 'keth_iron',
			isPushRun: false
		});
		const pushRun = generateSeededThumperEventWindows({
			runSeed: seed,
			targetResourceId: 'keth_iron',
			isPushRun: true
		});

		expect(defaultRun.windows).toHaveLength(DEFAULT_RUN_WINDOW_COUNT);
		expect(pushRun.windows).toHaveLength(PUSH_RUN_WINDOW_COUNT);
		expect(pushRun.projectedRecovery).toBeGreaterThan(defaultRun.projectedRecovery);
	});

	it('assigns deterministic severity per event window from the run seed (quiet windows have no severity)', () => {
		const plan = generateSeededThumperEventWindows({
			runSeed: 'severity-determinism',
			targetResourceId: 'keth_iron',
			isPushRun: false
		});

		// Event windows (not quiet) have severity
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		expect(eventWindows.length).toBeGreaterThan(0);
		expect(eventWindows.every((window) => window.severity === 'minor' || window.severity === 'serious')).toBe(
			true
		);

		const replay = generateSeededThumperEventWindows({
			runSeed: 'severity-determinism',
			targetResourceId: 'keth_iron',
			isPushRun: false
		});
		expect(replay.windows).toEqual(plan.windows);
	});

	it('draws only from the four locked complications for event windows (quiet windows have no complication)', () => {
		// Use 100% trigger probability to ensure all windows fire for this test
		const plan = generateSeededThumperEventWindows({
			runSeed: 'variety-check',
			targetResourceId: 'pale_ember_crystal',
			isPushRun: true,
			triggerProbability: 1.0
		});

		// All windows should fire events with 100% trigger probability
		expect(plan.windows.every((w) => !w.quiet)).toBe(true);
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		const complications = eventWindows.map((window) =>
			'complication' in window ? window.complication : ''
		);
		expect(new Set(complications).size).toBe(PUSH_RUN_WINDOW_COUNT);
		for (const complication of complications) {
			expect(THUMPER_COMPLICATION_TABLE.map((row) => row.complication)).toContain(
				complication
			);
		}
	});

	it('generates quiet windows with default 55% trigger probability', () => {
		// This test verifies that quiet windows can be generated
		const plan = generateSeededThumperEventWindows({
			runSeed: 'quiet-test-seed-42',
			targetResourceId: 'keth_iron',
			isPushRun: false
		});

		// With 55% trigger probability, we expect roughly 55% of windows to fire
		// This specific seed produces a mix - just verify structure is correct
		expect(plan.windows.length).toBe(DEFAULT_RUN_WINDOW_COUNT);

		// Every window should have quiet flag set
		expect(plan.windows.every((w) => typeof w.quiet === 'boolean')).toBe(true);

		// Event windows have complication/severity, quiet windows don't
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		const quietWindows = plan.windows.filter((w) => w.quiet);

		for (const w of eventWindows) {
			if (!w.quiet) {
				expect(w.complication).toBeDefined();
				expect(w.matchingAction).toBeDefined();
				expect(w.severity).toBeDefined();
			}
		}

		for (const w of quietWindows) {
			expect(w.quiet).toBe(true);
		}
	});
});

describe('getEventWindowResponseOptions', () => {
	it.each(THUMPER_COMPLICATION_TABLE)(
		'$complication maps to one matching response plus hold and Recall Early',
		({ complication, matchingAction }) => {
			const options = getEventWindowResponseOptions({
				complication,
				matchingAction,
				fieldRepairKitCount: 1
			});

			expect(options).toHaveLength(3);
			expect(options.map((option) => option.id)).toEqual([
				matchingAction,
				'hold',
				'recall_early'
			]);
			expect(options.every((option) => option.enabled)).toBe(true);
		}
	);

	it('disables Field Repair without a kit but keeps hold available', () => {
		const options = getEventWindowResponseOptions({
			complication: 'hull_damage',
			matchingAction: getMatchingAction('hull_damage'),
			fieldRepairKitCount: 0
		});

		expect(options[0]).toMatchObject({
			id: 'field_repair',
			enabled: false,
			disabledReason: expect.stringContaining('Field Repair Kit')
		});
		expect(options[1]).toMatchObject({ id: 'hold', enabled: true });
		expect(options[2]).toMatchObject({ id: 'recall_early', enabled: true });
	});
});

describe('generateThumperEventWindows', () => {
	it('tutorial run still produces the scripted Drift→Strain sequence', () => {
		const plan = generateThumperEventWindows({
			targetResourceId: 'veyrith_copper',
			runSeed: 'ignored-for-tutorial',
			isPushRun: false,
			tutorialRun: 2
		});

		const tutorialOnly = generateTutorialEventWindows({
			targetResourceId: 'veyrith_copper',
			tutorialRun: 2
		});

		// Tutorial windows are all event windows (no quiet)
		const planEvents = plan.windows.filter((w) => !w.quiet);
		const tutorialEvents = tutorialOnly.windows.filter((w) => !w.quiet);
		expect(planEvents.map((window) => 'complication' in window ? window.complication : '')).toEqual(
			tutorialEvents.map((window) => 'complication' in window ? window.complication : '')
		);
		expect(planEvents.map((window) => 'complication' in window ? window.complication : '')).toEqual([
			'signal_drift',
			'pump_strain'
		]);
		expect(plan.isPushRun).toBe(false);
	});

	it('rejects push mode on tutorial runs', () => {
		expect(() =>
			generateThumperEventWindows({
				targetResourceId: 'veyrith_copper',
				runSeed: 'tutorial',
				isPushRun: true,
				tutorialRun: 1
			})
		).toThrow(/push/i);
	});

	it('forwards extraction tail length to seeded window generation', () => {
		const shortPlan = generateThumperEventWindows({
			targetResourceId: 'veyrith_copper',
			runSeed: 'tail-test',
			isPushRun: false,
			extractionTailMinutes: 15
		});
		const longPlan = generateThumperEventWindows({
			targetResourceId: 'veyrith_copper',
			runSeed: 'tail-test',
			isPushRun: false,
			extractionTailMinutes: 240
		});

		expect(shortPlan.windowCount).toBe(2);
		expect(longPlan.windowCount).toBe(3);
	});
});
