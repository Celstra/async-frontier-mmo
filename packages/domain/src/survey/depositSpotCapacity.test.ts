import { describe, expect, it } from 'vitest';
import {
	depositSpotCapacityUnits,
	depositSpotRemainingUnits,
	depositSpotYieldBand,
	depositSpotYieldBandLabel,
	DEPOSIT_SPOT_CAPACITY_MIN_UNITS,
	DEPOSIT_SPOT_CAPACITY_MAX_UNITS
} from './depositSpotCapacity.js';

const bloomSeed = 'lesson-deposit-capacity-seed';

describe('depositSpotCapacity', () => {
	it('assigns deterministic capacity per spot', () => {
		const spotId = 'veyrith_copper:spot:0';
		const first = depositSpotCapacityUnits({ generationSeed: bloomSeed, spotId });
		const second = depositSpotCapacityUnits({ generationSeed: bloomSeed, spotId });

		expect(first).toBe(second);
		expect(first).toBeGreaterThanOrEqual(DEPOSIT_SPOT_CAPACITY_MIN_UNITS);
		expect(first).toBeLessThanOrEqual(DEPOSIT_SPOT_CAPACITY_MAX_UNITS);
	});

	it('keeps capacity floor above tutorial claim size', () => {
		const capacities = Array.from({ length: 20 }, (_, index) =>
			depositSpotCapacityUnits({
				generationSeed: bloomSeed,
				spotId: `veyrith_copper:spot:${index}`
			})
		);

		for (const capacity of capacities) {
			expect(capacity).toBeGreaterThan(130);
		}
	});

	it('maps remaining share to yield bands', () => {
		expect(depositSpotYieldBand(250, 300)).toBe('rich');
		expect(depositSpotYieldBand(100, 300)).toBe('thinning');
		expect(depositSpotYieldBand(40, 300)).toBe('nearly_dry');
		expect(depositSpotYieldBand(0, 300)).toBe('exhausted');
		expect(depositSpotYieldBandLabel('rich')).toBe('Rich deposit');
		expect(depositSpotYieldBandLabel('exhausted')).toBe('Exhausted');
	});

	it('computes remaining units from capacity and extracted', () => {
		expect(depositSpotRemainingUnits(200, 50)).toBe(150);
		expect(depositSpotRemainingUnits(200, 250)).toBe(0);
	});
});
