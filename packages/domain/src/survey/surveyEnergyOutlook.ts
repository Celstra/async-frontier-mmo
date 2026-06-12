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
	secondsPerEnergyBump: number;
	secondsUntilNextEnergyBump: number | null;
	nextEnergyBumpAtMs: number | null;
};

const HOUR_MS = 3_600_000;
const FLOATING_POINT_CEIL_EPSILON_MS = 0.001;

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

function nextEnergyBump(input: {
	storedEnergy: number;
	lastUpdatedAtMs: number;
	nowMs: number;
	cap: number;
	regenPerHour: number;
}): { secondsUntilNextEnergyBump: number | null; nextEnergyBumpAtMs: number | null } {
	if (input.regenPerHour <= 0) {
		return { secondsUntilNextEnergyBump: null, nextEnergyBumpAtMs: null };
	}

	const clamped = Math.min(input.cap, input.storedEnergy);
	const elapsedMs = Math.max(0, input.nowMs - input.lastUpdatedAtMs);
	const continuousEnergy = Math.min(
		input.cap,
		clamped + (elapsedMs / HOUR_MS) * input.regenPerHour
	);
	const currentEnergy = Math.round(continuousEnergy);

	if (currentEnergy >= input.cap) {
		return { secondsUntilNextEnergyBump: null, nextEnergyBumpAtMs: null };
	}

	const nextDisplayedEnergyThreshold = currentEnergy + 0.5;
	const energyDeficit = Math.max(0, nextDisplayedEnergyThreshold - continuousEnergy);
	const msUntilNextBump = Math.max(
		0,
		Math.ceil((energyDeficit / input.regenPerHour) * HOUR_MS - FLOATING_POINT_CEIL_EPSILON_MS)
	);
	const secondsUntilNextEnergyBump = Math.ceil(msUntilNextBump / 1000);

	return {
		secondsUntilNextEnergyBump,
		nextEnergyBumpAtMs: input.nowMs + msUntilNextBump
	};
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
	const secondsPerEnergyBump = Math.ceil(3600 / regenPerHour);
	const bump = nextEnergyBump({
		storedEnergy: input.storedEnergy,
		lastUpdatedAtMs: input.lastUpdatedAtMs,
		nowMs: input.nowMs,
		cap,
		regenPerHour
	});

	return {
		regenSamplesPerHour: ENERGY_REGEN_SAMPLES_PER_HOUR,
		hoursUntilFull: energy >= cap ? 0 : hoursUntilEnergyTarget(energy, cap, regenPerHour),
		canScanNow: energy >= FAMILY_SCAN_ENERGY_COST,
		canSampleNow: energy >= SAMPLE_ENERGY_COST,
		hoursUntilNextScan: hoursUntilEnergyTarget(energy, FAMILY_SCAN_ENERGY_COST, regenPerHour),
		hoursUntilNextSample: hoursUntilEnergyTarget(energy, SAMPLE_ENERGY_COST, regenPerHour),
		secondsPerEnergyBump,
		...bump
	};
}
