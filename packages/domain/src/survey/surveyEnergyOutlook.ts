import {
	accrueEnergy,
	FAMILY_SCAN_ENERGY_COST,
	SAMPLE_ENERGY_COST,
	SURVEY_ENERGY_CAP
} from './prospectingSampling.js';
import { ENERGY_REGEN_SAMPLES_PER_HOUR } from '../tuning.js';

export type SurveyEnergyOutlook = {
	regenSamplesPerHour: number;
	hoursUntilFull: number;
	canScanNow: boolean;
	canSampleNow: boolean;
	hoursUntilNextScan: number;
	hoursUntilNextSample: number;
};

function hoursUntilEnergyTarget(
	currentEnergy: number,
	targetEnergy: number,
	regenPerHour: number
): number {
	if (currentEnergy >= targetEnergy) {
		return 0;
	}
	const deficit = targetEnergy - currentEnergy;
	return deficit / regenPerHour;
}

/**
 * Player-facing survey energy timing — continuous trickle rate and hours until scan/sample/full.
 */
export function surveyEnergyOutlook(input: {
	storedEnergy: number;
	lastUpdatedAtMs: number;
	nowMs: number;
}): SurveyEnergyOutlook {
	const regenPerHour = ENERGY_REGEN_SAMPLES_PER_HOUR * SAMPLE_ENERGY_COST;
	const resolved = accrueEnergy(
		{ rawEnergy: input.storedEnergy, updatedAtMs: input.lastUpdatedAtMs },
		input.nowMs
	);
	const energy = resolved.rawEnergy;
	const cap = SURVEY_ENERGY_CAP;

	return {
		regenSamplesPerHour: ENERGY_REGEN_SAMPLES_PER_HOUR,
		hoursUntilFull: energy >= cap ? 0 : hoursUntilEnergyTarget(energy, cap, regenPerHour),
		canScanNow: energy >= FAMILY_SCAN_ENERGY_COST,
		canSampleNow: energy >= SAMPLE_ENERGY_COST,
		hoursUntilNextScan: hoursUntilEnergyTarget(energy, FAMILY_SCAN_ENERGY_COST, regenPerHour),
		hoursUntilNextSample: hoursUntilEnergyTarget(energy, SAMPLE_ENERGY_COST, regenPerHour)
	};
}
