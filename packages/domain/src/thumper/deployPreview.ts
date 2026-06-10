import { concentrationPercentToExtractionMultiplier } from '../survey/prospectingSampling.js';
import {
	DEFAULT_PROJECTED_RECOVERY,
	PUSH_RUN_PROJECTED_RECOVERY
} from './generateSeededThumperEventWindows.js';
import { partConditionPerformanceMultiplier } from './thumperPartModifiers.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';

/** Foreground event-window phase before passive extraction tail (Decision 017). */
export const ACTIVE_PHASE_SECONDS = 60;

export const EXTRACTION_TAIL_OPTIONS = [
	{ id: '15m', minutes: 15, label: '15 min' },
	{ id: '1h', minutes: 60, label: '1 hour' },
	{ id: '4h', minutes: 240, label: '4 hours' },
	{ id: '8h', minutes: 480, label: '8 hours' }
] as const;

export type ExtractionTailId = (typeof EXTRACTION_TAIL_OPTIONS)[number]['id'];

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

export type DeployPreview = DeployRunMeterPreview & {
	baseProjectedRecovery: number;
	concentrationMultiplier: number;
	extractionTailMinutes: number;
	tailYieldMultiplier: number;
	totalDurationSeconds: number;
	isPushRun: boolean;
};

export function parseExtractionTailMinutes(value: string | null | undefined): number {
	const match = EXTRACTION_TAIL_OPTIONS.find((option) => option.id === value);
	return match?.minutes ?? 60;
}

/** Decision 017 — sublinear passive yield vs 1 h baseline: (minutes/60)^0.5 */
export function extractionTailYieldMultiplier(tailMinutes: number): number {
	return Math.pow(tailMinutes / 60, 0.5);
}

export function totalRunDurationSeconds(
	activePhaseSeconds: number,
	tailMinutes: number
): number {
	return activePhaseSeconds + tailMinutes * 60;
}

export function baseProjectedRecoveryForRun(isPushRun: boolean): number {
	return isPushRun ? PUSH_RUN_PROJECTED_RECOVERY : DEFAULT_PROJECTED_RECOVERY;
}

export function computeDeployProjectedRecovery(input: {
	baseProjectedRecovery: number;
	trueConcentrationPercent: number;
	extractionTailMinutes: number;
	partModifiers?: ThumperPartRunModifiers;
	recoveryFloor?: number;
}): number {
	const concentrationMultiplier = concentrationPercentToExtractionMultiplier(
		input.trueConcentrationPercent
	);
	const tailMultiplier = extractionTailYieldMultiplier(input.extractionTailMinutes);
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
	partModifiers?: ThumperPartRunModifiers;
	recoveryFloor?: number;
}): number {
	return computeDeployProjectedRecovery({
		baseProjectedRecovery: baseProjectedRecoveryForRun(input.isPushRun),
		trueConcentrationPercent: input.trueConcentrationPercent ?? 67,
		extractionTailMinutes: input.extractionTailMinutes ?? 60,
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
	const tailYieldMultiplier = extractionTailYieldMultiplier(input.extractionTailMinutes);
	const projectedRecovery = computeDeployProjectedRecovery({
		baseProjectedRecovery,
		trueConcentrationPercent: input.trueConcentrationPercent,
		extractionTailMinutes: input.extractionTailMinutes,
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
