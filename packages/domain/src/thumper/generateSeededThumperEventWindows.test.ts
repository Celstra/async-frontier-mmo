import { describe, expect, it } from 'vitest';
import { THUMPER_COMPLICATION_TABLE } from './complicationTable.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
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

	it('assigns deterministic severity per window from the run seed', () => {
		const plan = generateSeededThumperEventWindows({
			runSeed: 'severity-determinism',
			targetResourceId: 'keth_iron',
			isPushRun: false
		});

		expect(plan.windows.every((window) => window.severity === 'minor' || window.severity === 'serious')).toBe(
			true
		);
		const replay = generateSeededThumperEventWindows({
			runSeed: 'severity-determinism',
			targetResourceId: 'keth_iron',
			isPushRun: false
		});
		expect(replay.windows.map((window) => window.severity)).toEqual(
			plan.windows.map((window) => window.severity)
		);
	});

	it('draws only from the four locked complications without repeats', () => {
		const plan = generateSeededThumperEventWindows({
			runSeed: 'variety-check',
			targetResourceId: 'pale_ember_crystal',
			isPushRun: true
		});

		const complications = plan.windows.map((window) => window.complication);
		expect(new Set(complications).size).toBe(PUSH_RUN_WINDOW_COUNT);
		for (const complication of complications) {
			expect(THUMPER_COMPLICATION_TABLE.map((row) => row.complication)).toContain(
				complication
			);
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
			isTutorialRun: true
		});

		const tutorialOnly = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		expect(plan.windows.map((window) => window.complication)).toEqual(
			tutorialOnly.windows.map((window) => window.complication)
		);
		expect(plan.windows.map((window) => window.complication)).toEqual([
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
				isTutorialRun: true
			})
		).toThrow(/push/i);
	});
});
