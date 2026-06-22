/** Decision 025 defense pivot — replaces project-led watched pressure-menu runs. */

import { DEFENSE_RUN_DURATION_SECONDS as DEFENSE_ENCOUNTER_DURATION_SECONDS } from './thumperDefenseRun.js';

export const PROJECT_LED_DEFENSE_RUN_MODE = 'project_led_defense' as const;

export const PROJECT_LED_COMMAND_QUEUE_RUN_MODE = 'project_led_command_queue' as const;

/** @deprecated Use PROJECT_LED_DEFENSE_RUN_MODE. Kept for DB rows created before pivot. */
export const PROJECT_LED_WATCHED_RUN_MODE = 'project_led_watched' as const;

/** Target encounter length for the defense prototype (Phase 4+). */
export const DEFENSE_RUN_DURATION_SECONDS = DEFENSE_ENCOUNTER_DURATION_SECONDS;

export function isProjectLedDefenseRun(runMode: string | null | undefined): boolean {
	return (
		runMode === PROJECT_LED_DEFENSE_RUN_MODE || runMode === PROJECT_LED_WATCHED_RUN_MODE
	);
}

export function isProjectLedCommandQueueRun(runMode: string | null | undefined): boolean {
	return runMode === PROJECT_LED_COMMAND_QUEUE_RUN_MODE;
}

export function isProjectLedThumperMomentRun(runMode: string | null | undefined): boolean {
	return isProjectLedDefenseRun(runMode) || isProjectLedCommandQueueRun(runMode);
}

/** @deprecated Alias for migration — pressure-menu runs are retired. */
export function isActiveMomentRun(runMode: string | null | undefined): boolean {
	return isProjectLedDefenseRun(runMode);
}

export function defenseRunDurationSeconds(): number {
	return DEFENSE_RUN_DURATION_SECONDS;
}

/** @deprecated Alias — use defenseRunDurationSeconds. */
export function activeMomentRunDurationSeconds(): number {
	return defenseRunDurationSeconds();
}

export function defenseRunProgressPercent(input: {
	deployedAt: Date;
	now: Date;
	durationSeconds?: number;
}): number {
	const duration = input.durationSeconds ?? DEFENSE_RUN_DURATION_SECONDS;
	const elapsedMs = input.now.getTime() - input.deployedAt.getTime();
	const elapsedSeconds = Math.max(0, elapsedMs / 1000);
	return Math.min(100, (elapsedSeconds / duration) * 100);
}

/** @deprecated Alias — use defenseRunProgressPercent. */
export function activeMomentRunProgressPercent(input: {
	deployedAt: Date;
	now: Date;
	durationSeconds?: number;
}): number {
	return defenseRunProgressPercent(input);
}

/** Phase 0 stub — use {@link isDefenseRunEnded} from thumperDefenseRun for real runs. */
export function isDefenseRunReadyToResolve(input?: { ended?: boolean }): boolean {
	return input?.ended === true;
}

export type DefensePrototypeView = {
	progressPercent: number;
	securedYield: number;
	atRiskYield: number;
	projectNeedUnits: number;
	placeholderMessage: string;
};

export function buildDefensePrototypeView(input: {
	deployedAt: Date;
	now: Date;
	durationSeconds: number;
	projectNeedUnits: number;
}): DefensePrototypeView {
	const progressPercent = defenseRunProgressPercent({
		deployedAt: input.deployedAt,
		now: input.now,
		durationSeconds: input.durationSeconds
	});

	return {
		progressPercent,
		securedYield: 0,
		atRiskYield: 0,
		projectNeedUnits: input.projectNeedUnits,
		placeholderMessage:
			'Defense board prototype is in development. Deploy locks the spot; claim unlocks after the encounter ships in Phase 4–6.'
	};
}
