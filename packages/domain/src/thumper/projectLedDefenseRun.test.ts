import { describe, expect, it } from 'vitest';
import {
	DEFENSE_RUN_DURATION_SECONDS,
	buildDefensePrototypeView,
	defenseRunProgressPercent,
	isDefenseRunReadyToResolve,
	isProjectLedCommandQueueRun,
	isProjectLedDefenseRun,
	isProjectLedThumperMomentRun
} from './projectLedDefenseRun.js';

describe('projectLedDefenseRun', () => {
	it('treats legacy watched mode as defense pivot runs', () => {
		expect(isProjectLedDefenseRun('project_led_defense')).toBe(true);
		expect(isProjectLedDefenseRun('project_led_watched')).toBe(true);
		expect(isProjectLedDefenseRun(null)).toBe(false);
	});

	it('recognizes command queue project-led runs separately from defense', () => {
		expect(isProjectLedCommandQueueRun('project_led_command_queue')).toBe(true);
		expect(isProjectLedCommandQueueRun('project_led_defense')).toBe(false);
		expect(isProjectLedThumperMomentRun('project_led_command_queue')).toBe(true);
	});

	it('blocks claim resolution until the defense encounter ends', () => {
		expect(isDefenseRunReadyToResolve()).toBe(false);
		expect(isDefenseRunReadyToResolve({ ended: false })).toBe(false);
		expect(isDefenseRunReadyToResolve({ ended: true })).toBe(true);
	});

	it('tracks encounter progress from deploy time', () => {
		const deployedAt = new Date('2026-06-20T12:00:00.000Z');
		const halfway = new Date(deployedAt.getTime() + (DEFENSE_RUN_DURATION_SECONDS * 1000) / 2);
		expect(
			defenseRunProgressPercent({
				deployedAt,
				now: halfway,
				durationSeconds: DEFENSE_RUN_DURATION_SECONDS
			})
		).toBe(50);
	});

	it('does not mention seam quality in the defense placeholder', () => {
		const view = buildDefensePrototypeView({
			deployedAt: new Date('2026-06-20T12:00:00.000Z'),
			now: new Date('2026-06-20T12:00:10.000Z'),
			durationSeconds: DEFENSE_RUN_DURATION_SECONDS,
			projectNeedUnits: 120
		});
		expect(view.placeholderMessage.toLowerCase()).not.toContain('seam quality');
		expect(view.placeholderMessage.toLowerCase()).not.toContain('pressure beat');
	});
});
