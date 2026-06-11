import { describe, expect, it } from 'vitest';
import { getMatchingAction, THUMPER_EVENT_ACTIONS } from './complicationActions.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';

describe('generateFirstSessionEventWindows', () => {
	it('tutorial Veyrith Copper run gets Signal Drift then Pump Strain', () => {
		const plan = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		expect(plan.windows).toHaveLength(2);
		// Tutorial windows are all event windows (no quiet windows)
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		expect(eventWindows.map((w) => ('complication' in w ? w.complication : ''))).toEqual([
			'signal_drift',
			'pump_strain'
		]);
		expect(plan.windows.map((w) => w.windowIndex)).toEqual([1, 2]);
	});

	it('each complication has the correct matching action', () => {
		const plan = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		// Tutorial has only event windows (no quiet windows)
		const eventWindows = plan.windows.filter((w) => !w.quiet);
		expect(eventWindows[0]).toMatchObject({
			quiet: false,
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			severity: 'minor'
		});
		expect(eventWindows[1]).toMatchObject({
			quiet: false,
			complication: 'pump_strain',
			matchingAction: 'clear_pump_problem',
			severity: 'minor'
		});
	});

	it('Recall Early is available but not counted as one of the four event actions', () => {
		const plan = generateFirstSessionEventWindows({
			targetResourceId: 'veyrith_copper'
		});

		expect(plan.safetyChoices).toEqual(['recall_early']);
		expect(plan.eventActions).toEqual(THUMPER_EVENT_ACTIONS);
		expect(plan.eventActions).toHaveLength(4);
		expect(plan.eventActions).not.toContain('recall_early');
		expect(plan.safetyChoices).not.toEqual(plan.eventActions);
	});
});

describe('getMatchingAction', () => {
	it('pair map covers all four complications', () => {
		expect(getMatchingAction('signal_drift')).toBe('signal_tune');
		expect(getMatchingAction('hull_damage')).toBe('field_repair');
		expect(getMatchingAction('threat_surge')).toBe('suppress_threat');
		expect(getMatchingAction('pump_strain')).toBe('clear_pump_problem');
	});
});
