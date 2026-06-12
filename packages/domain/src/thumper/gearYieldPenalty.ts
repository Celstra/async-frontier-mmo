import {
	baseProjectedRecoveryForRun,
	computeDeployProjectedRecovery
} from './deployPreview.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';

export type GearYieldPenaltySummary = {
	/** Combined condition/integrity multiplier from equipped thumper parts (0.5–1). */
	performanceMultiplier: number;
	/** Rounded player-facing gear efficiency percentage. */
	performancePercent: number;
	projectedRecovery: number;
	/** Same run math with performanceMultiplier forced to 1 (repaired gear baseline). */
	recoveryAtFullPerformance: number;
	unitsLostToWear: number;
	isPenalized: boolean;
};

export function buildGearYieldPenaltySummary(input: {
	isPushRun: boolean;
	trueConcentrationPercent: number;
	extractionTailMinutes: number;
	isTutorialRun?: boolean;
	partModifiers: ThumperPartRunModifiers;
	recoveryFloor?: number;
}): GearYieldPenaltySummary {
	const baseProjectedRecovery = baseProjectedRecoveryForRun(input.isPushRun);
	const shared = {
		baseProjectedRecovery,
		trueConcentrationPercent: input.trueConcentrationPercent,
		extractionTailMinutes: input.extractionTailMinutes,
		isTutorialRun: input.isTutorialRun,
		recoveryFloor: input.recoveryFloor
	};

	const projectedRecovery = computeDeployProjectedRecovery({
		...shared,
		partModifiers: input.partModifiers
	});
	const recoveryAtFullPerformance = computeDeployProjectedRecovery({
		...shared,
		partModifiers: {
			pumpRecoveryBonus: input.partModifiers.pumpRecoveryBonus,
			performanceMultiplier: 1
		}
	});

	const unitsLostToWear = Math.max(0, recoveryAtFullPerformance - projectedRecovery);
	const performanceMultiplier = input.partModifiers.performanceMultiplier;

	return {
		performanceMultiplier,
		performancePercent: Math.round(performanceMultiplier * 100),
		projectedRecovery,
		recoveryAtFullPerformance,
		unitsLostToWear,
		isPenalized: unitsLostToWear > 0
	};
}
