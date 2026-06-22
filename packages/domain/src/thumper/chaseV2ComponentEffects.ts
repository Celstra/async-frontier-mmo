import type { ThumperPartSnapshot } from './thumperPartTypes.js';
import { partConditionPerformanceMultiplier } from './thumperPartModifiers.js';

export const CHASE_V2_EFFECT_PROFILE = {
	id: 'chase_v2',
	curve: 1.35,
	extractionBonus: 0.34,
	depthBonus: 0.22,
	drillWearReduction: 0.48,
	recoveryBonus: 0.31,
	pumpHazardReduction: 0.46,
	pumpWearReduction: 0.4,
	stabilityReduction: 0.43,
	cargoBase: 4,
	cargoMaxBonus: 9,
	cargoStabilityBonus: 3,
	hullDamageReduction: 0.52,
	repairPressureReduction: 0.44
} as const;

function scoreNorm(score: number, floor = 35, ceiling = 95): number {
	return Math.max(0, Math.min(1, (score - floor) / (ceiling - floor)));
}

function scoreBidirectional(score: number, midpoint = 55, spread = 40): number {
	return Math.max(-1, Math.min(1, (score - midpoint) / spread));
}

function curvedNorm(score: number): number {
	return scoreNorm(score) ** CHASE_V2_EFFECT_PROFILE.curve;
}

function curvedBidirectional(score: number): number {
	const value = scoreBidirectional(score);
	if (value >= 0) {
		return value ** CHASE_V2_EFFECT_PROFILE.curve;
	}
	return -(Math.abs(value) ** CHASE_V2_EFFECT_PROFILE.curve);
}

export type ChaseV2ComponentEffects = {
	extractionRateMultiplier: number;
	depthConcentrationMultiplier: number;
	drillWearMultiplier: number;
	recoveryMultiplier: number;
	pumpHazardMultiplier: number;
	pumpWearMultiplier: number;
	fieldStabilityMultiplier: number;
	secureCargoCapacity: number;
	hullDamageMultiplier: number;
	repairPressureMultiplier: number;
};

export function computeChaseV2ComponentEffects(
	parts: ThumperPartSnapshot[]
): ChaseV2ComponentEffects {
	const drill = parts.find((part) => part.slot === 'drill');
	const pump = parts.find((part) => part.slot === 'pump');
	const hull = parts.find((part) => part.slot === 'hull');

	const drillScores = drill?.propertyScores ?? {};
	const pumpScores = pump?.propertyScores ?? {};
	const hullScores = hull?.propertyScores ?? {};

	const extraction = curvedBidirectional(drillScores.extraction_rate ?? 35);
	const depth = curvedBidirectional(drillScores.depth_access ?? 35);
	const wearControl = curvedNorm(drillScores.wear_control ?? 35);
	const recovery = curvedBidirectional(pumpScores.recovery_efficiency ?? 35);
	const clog = curvedNorm(pumpScores.clog_resistance ?? 35);
	const stability = curvedNorm(pumpScores.field_stability ?? 35);
	const maxCondition = curvedNorm(hullScores.max_condition ?? 35);
	const damageReduction = curvedNorm(hullScores.damage_reduction ?? 35);
	const repairability = curvedNorm(hullScores.repairability ?? 35);
	const profile = CHASE_V2_EFFECT_PROFILE;

	return {
		extractionRateMultiplier: 1 + profile.extractionBonus * extraction,
		depthConcentrationMultiplier: 1 + profile.depthBonus * depth,
		drillWearMultiplier: 1 - profile.drillWearReduction * wearControl,
		recoveryMultiplier: 1 + profile.recoveryBonus * recovery,
		pumpHazardMultiplier: 1 - profile.pumpHazardReduction * clog,
		pumpWearMultiplier: 1 - profile.pumpWearReduction * clog,
		fieldStabilityMultiplier: 1 - profile.stabilityReduction * stability,
		secureCargoCapacity:
			profile.cargoBase +
			profile.cargoMaxBonus * maxCondition +
			profile.cargoStabilityBonus * stability,
		hullDamageMultiplier: 1 - profile.hullDamageReduction * damageReduction,
		repairPressureMultiplier: 1 - profile.repairPressureReduction * repairability
	};
}

export function geometricMean(values: number[]): number {
	if (values.length === 0) {
		return 1;
	}
	return values.reduce((product, value) => product * value, 1) ** (1 / values.length);
}

export function defenseBaseRateFromParts(input: {
	parts: ThumperPartSnapshot[];
	concentrationPercent: number;
	baseExtractionRate?: number;
}): number {
	const effects = computeChaseV2ComponentEffects(input.parts);
	const concentrationMultiplier =
		Math.min(1.5, Math.max(0.5, input.concentrationPercent / 67)) *
		effects.depthConcentrationMultiplier;
	const conditionMultiplier = geometricMean(
		input.parts.map((part) => partConditionPerformanceMultiplier(part.condition, part.integrity))
	);
	const base = input.baseExtractionRate ?? 2.55;
	return (
		base *
		concentrationMultiplier *
		effects.extractionRateMultiplier *
		effects.recoveryMultiplier *
		conditionMultiplier
	);
}
