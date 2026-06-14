import { concentrationPercentToExtractionMultiplier } from '../survey/prospectingSampling.js';
import { RUN_TAILS_MINUTES, TUTORIAL_RUN_1_MINUTES, TUTORIAL_RUN_2_MINUTES, type HullTier } from '../tuning.js';
import { availableTails } from './hullRunCeiling.js';
import {
	DEFAULT_PROJECTED_RECOVERY,
	PUSH_RUN_PROJECTED_RECOVERY
} from './generateSeededThumperEventWindows.js';
import { partConditionPerformanceMultiplier } from './thumperPartModifiers.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';

/** Foreground event-window phase before passive extraction tail (Decision 017). */
export const ACTIVE_PHASE_SECONDS = 60;

export const EXTRACTION_TAIL_OPTIONS = [
	{ id: '15m', minutes: RUN_TAILS_MINUTES[0], label: '15 min' },
	{ id: '1h', minutes: RUN_TAILS_MINUTES[1], label: '1 hour' },
	{ id: '4h', minutes: RUN_TAILS_MINUTES[2], label: '4 hours' }
] as const;

/** Tutorial-only tails — never in EXTRACTION_TAIL_OPTIONS. */
export const TUTORIAL_EXTRACTION_TAIL_OPTION = {
	id: '2m',
	minutes: TUTORIAL_RUN_1_MINUTES,
	label: '2 min (training)'
} as const;

export const TUTORIAL_EXTRACTION_TAIL_OPTION_5M = {
	id: '5m',
	minutes: TUTORIAL_RUN_2_MINUTES,
	label: '5 min (training)'
} as const;

export type ExtractionTailId = (typeof EXTRACTION_TAIL_OPTIONS)[number]['id'];

export type HullExtractionTailOption = (typeof EXTRACTION_TAIL_OPTIONS)[number] & {
	allowed: boolean;
};

/** Player-facing tail menu with hull-ceiling gating (async reveal, deploy picker). */
export function extractionTailOptionsForHull(
	tier: HullTier,
	integrityPct: number,
	options?: {
		includeTutorialTails?: boolean;
		unlockFirstAsyncTail?: boolean;
		allowFirstHullEmergencyRun?: boolean;
	}
): HullExtractionTailOption[] {
	const allowedMinutes = new Set(
		availableTails(tier, integrityPct, options).map((tail) => tail.minutes)
	);

	return EXTRACTION_TAIL_OPTIONS.map((option) => ({
		...option,
		allowed: allowedMinutes.has(option.minutes)
	}));
}

export function preferredExtractionTailMinutes(
	allowedTailMinutes: number[],
	chosenTailMinutes: number | null | undefined
): number {
	if (chosenTailMinutes && allowedTailMinutes.includes(chosenTailMinutes)) {
		return chosenTailMinutes;
	}

	return allowedTailMinutes[0] ?? RUN_TAILS_MINUTES[0];
}

export type DeployEquippedPartSummary = {
	displayName: string;
	condition: number;
	integrity: number;
};

export type DeployRunMeterPreview = {
	projectedRecovery: number;
	signalLock: number;
	pumpFlow: number;
	threatPressure: number;
	hullCondition: number;
	depthRisk: number;
	conditionRisk: number;
};

/** Decision 005 run-state meters shown during the active thumper run. */
export type ActiveRunMeterPreview = Pick<
	DeployRunMeterPreview,
	'projectedRecovery' | 'signalLock' | 'pumpFlow' | 'threatPressure' | 'hullCondition'
>;

export type DeployPreview = DeployRunMeterPreview & {
	baseProjectedRecovery: number;
	concentrationMultiplier: number;
	extractionTailMinutes: number;
	tailYieldMultiplier: number;
	totalDurationSeconds: number;
	isPushRun: boolean;
};

export function parseExtractionTailMinutes(
	value: string | null | undefined,
	options?: { isTutorialRun?: boolean }
): number {
	if (options?.isTutorialRun && value === TUTORIAL_EXTRACTION_TAIL_OPTION.id) {
		return TUTORIAL_EXTRACTION_TAIL_OPTION.minutes;
	}

	const match = EXTRACTION_TAIL_OPTIONS.find((option) => option.id === value);
	return match?.minutes ?? 60;
}

/** Decision 017 — sublinear passive yield vs 1 h baseline: (minutes/60)^0.5 */
export function extractionTailYieldMultiplier(tailMinutes: number): number {
	return Math.pow(tailMinutes / 60, 0.5);
}

/**
 * Tutorial runs compress wall-clock time but keep at least 1 h baseline yield
 * (Decision 017 amendment 2026-06-11).
 */
export function effectiveExtractionTailYieldMultiplier(
	tailMinutes: number,
	isTutorialRun?: boolean
): number {
	const raw = extractionTailYieldMultiplier(tailMinutes);
	return isTutorialRun ? Math.max(1, raw) : raw;
}

export function totalRunDurationSeconds(
	_activePhaseSeconds: number,
	tailMinutes: number
): number {
	return tailMinutes * 60;
}

export function baseProjectedRecoveryForRun(isPushRun: boolean): number {
	return isPushRun ? PUSH_RUN_PROJECTED_RECOVERY : DEFAULT_PROJECTED_RECOVERY;
}

export function computeDeployProjectedRecovery(input: {
	baseProjectedRecovery: number;
	trueConcentrationPercent: number;
	extractionTailMinutes: number;
	isTutorialRun?: boolean;
	partModifiers?: ThumperPartRunModifiers;
	recoveryFloor?: number;
}): number {
	const concentrationMultiplier = concentrationPercentToExtractionMultiplier(
		input.trueConcentrationPercent
	);
	const tailMultiplier = effectiveExtractionTailYieldMultiplier(
		input.extractionTailMinutes,
		input.isTutorialRun
	);
	const pumpBonus = input.partModifiers?.pumpRecoveryBonus ?? 0;
	const performance = input.partModifiers?.performanceMultiplier ?? 1;

	const raw = Math.round(
		input.baseProjectedRecovery * concentrationMultiplier * tailMultiplier * performance +
			pumpBonus
	);

	if (input.recoveryFloor !== undefined) {
		return Math.max(input.recoveryFloor, raw);
	}

	return raw;
}

export function projectedRecoveryForStoredRun(input: {
	isPushRun: boolean;
	trueConcentrationPercent?: number | null;
	extractionTailMinutes?: number | null;
	isTutorialRun?: boolean;
	partModifiers?: ThumperPartRunModifiers;
	recoveryFloor?: number;
}): number {
	return computeDeployProjectedRecovery({
		baseProjectedRecovery: baseProjectedRecoveryForRun(input.isPushRun),
		trueConcentrationPercent: input.trueConcentrationPercent ?? 67,
		extractionTailMinutes: input.extractionTailMinutes ?? 60,
		isTutorialRun: input.isTutorialRun,
		partModifiers: input.partModifiers,
		recoveryFloor: input.recoveryFloor
	});
}

/**
 * Deterministic deploy preview — player-facing estimates before the run resolves.
 * Projected values are targets; claim applies event-window math (Decision 005).
 */
export function buildDeployPreview(input: {
	trueConcentrationPercent: number;
	extractionTailMinutes: number;
	isPushRun: boolean;
	isTutorialRun?: boolean;
	partModifiers: ThumperPartRunModifiers;
	surveyClarityScore?: number;
	equippedParts: {
		drill: DeployEquippedPartSummary | null;
		pump: DeployEquippedPartSummary | null;
		hull: DeployEquippedPartSummary | null;
	};
	recoveryFloor?: number;
}): DeployPreview {
	const baseProjectedRecovery = baseProjectedRecoveryForRun(input.isPushRun);
	const concentrationMultiplier = concentrationPercentToExtractionMultiplier(
		input.trueConcentrationPercent
	);
	const tailYieldMultiplier = effectiveExtractionTailYieldMultiplier(
		input.extractionTailMinutes,
		input.isTutorialRun
	);
	const projectedRecovery = computeDeployProjectedRecovery({
		baseProjectedRecovery,
		trueConcentrationPercent: input.trueConcentrationPercent,
		extractionTailMinutes: input.extractionTailMinutes,
		isTutorialRun: input.isTutorialRun,
		partModifiers: input.partModifiers,
		recoveryFloor: input.recoveryFloor
	});

	const clarity = input.surveyClarityScore ?? 0;
	const signalLock = Math.min(
		100,
		Math.round(35 + input.trueConcentrationPercent * 0.45 + clarity * 0.25)
	);

	const pumpFlow = input.equippedParts.pump
		? Math.round(
				partConditionPerformanceMultiplier(
					input.equippedParts.pump.condition,
					input.equippedParts.pump.integrity
				) * 100
			)
		: 70;

	const threatPressure = input.isPushRun ? 42 : 24;
	const hullCondition = input.equippedParts.hull?.condition ?? 100;

	const depthRisk = Math.min(
		100,
		Math.round(20 + (100 - input.trueConcentrationPercent) * 0.6 + (input.isPushRun ? 12 : 0))
	);
	const conditionRisk = Math.min(
		100,
		Math.round(
			100 -
				hullCondition * 0.6 -
				(input.equippedParts.drill?.condition ?? 80) * 0.2 -
				pumpFlow * 0.2
		)
	);

	return {
		baseProjectedRecovery,
		concentrationMultiplier,
		extractionTailMinutes: input.extractionTailMinutes,
		tailYieldMultiplier,
		totalDurationSeconds: totalRunDurationSeconds(
			ACTIVE_PHASE_SECONDS,
			input.extractionTailMinutes
		),
		isPushRun: input.isPushRun,
		projectedRecovery,
		signalLock,
		pumpFlow,
		threatPressure,
		hullCondition,
		depthRisk,
		conditionRisk
	};
}

/**
 * Player-facing run meters during an open thumper run.
 * Uses deploy math for recovery/signal/pump/threat; hull reads live run durability.
 */
export function buildActiveRunMeters(input: {
	trueConcentrationPercent: number;
	extractionTailMinutes: number;
	isPushRun: boolean;
	isTutorialRun?: boolean;
	partModifiers: ThumperPartRunModifiers;
	surveyClarityScore?: number;
	equippedParts: {
		drill: DeployEquippedPartSummary | null;
		pump: DeployEquippedPartSummary | null;
		hull: DeployEquippedPartSummary | null;
	};
	runHullCondition: number;
	recoveryFloor?: number;
}): ActiveRunMeterPreview {
	const deploy = buildDeployPreview({
		trueConcentrationPercent: input.trueConcentrationPercent,
		extractionTailMinutes: input.extractionTailMinutes,
		isPushRun: input.isPushRun,
		isTutorialRun: input.isTutorialRun,
		partModifiers: input.partModifiers,
		surveyClarityScore: input.surveyClarityScore,
		equippedParts: input.equippedParts,
		recoveryFloor: input.recoveryFloor
	});

	return {
		projectedRecovery: deploy.projectedRecovery,
		signalLock: deploy.signalLock,
		pumpFlow: deploy.pumpFlow,
		threatPressure: deploy.threatPressure,
		hullCondition: input.runHullCondition
	};
}
