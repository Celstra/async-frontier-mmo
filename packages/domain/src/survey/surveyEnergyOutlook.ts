import {
	FAMILY_SCAN_ENERGY_COST,
	resolveSurveyEnergy,
	SAMPLE_ENERGY_COST,
	SURVEY_ENERGY_CAP,
	SURVEY_ENERGY_REGEN_PER_MINUTE
} from './prospectingSampling.js';

export type SurveyEnergyOutlook = {
	regenPerMinute: number;
	minutesUntilFull: number;
	canScanNow: boolean;
	canSampleNow: boolean;
	minutesUntilNextScan: number;
	minutesUntilNextSample: number;
};

function minutesUntilEnergyTarget(currentEnergy: number, targetEnergy: number, regenPerMinute: number): number {
	if (currentEnergy >= targetEnergy) {
		return 0;
	}
	const deficit = targetEnergy - currentEnergy;
	return Math.ceil(deficit / regenPerMinute);
}

/**
 * Player-facing survey energy timing — regen rate and minutes until scan/sample/full.
 */
export function surveyEnergyOutlook(input: {
	storedEnergy: number;
	lastUpdatedAtMs: number;
	nowMs: number;
	cap?: number;
	regenPerMinute?: number;
}): SurveyEnergyOutlook {
	const cap = input.cap ?? SURVEY_ENERGY_CAP;
	const regenPerMinute = input.regenPerMinute ?? SURVEY_ENERGY_REGEN_PER_MINUTE;
	const resolved = resolveSurveyEnergy({
		storedEnergy: input.storedEnergy,
		lastUpdatedAtMs: input.lastUpdatedAtMs,
		nowMs: input.nowMs,
		cap,
		regenPerMinute
	});
	const energy = resolved.energy;

	return {
		regenPerMinute,
		minutesUntilFull:
			energy >= cap ? 0 : minutesUntilEnergyTarget(energy, cap, regenPerMinute),
		canScanNow: energy >= FAMILY_SCAN_ENERGY_COST,
		canSampleNow: energy >= SAMPLE_ENERGY_COST,
		minutesUntilNextScan: minutesUntilEnergyTarget(energy, FAMILY_SCAN_ENERGY_COST, regenPerMinute),
		minutesUntilNextSample: minutesUntilEnergyTarget(energy, SAMPLE_ENERGY_COST, regenPerMinute)
	};
}
