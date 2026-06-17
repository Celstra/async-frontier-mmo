import { describe, expect, it } from 'vitest';
import {
	WORKSHOP_CRAFT_COUNT_CRATE_INTERVAL,
	WORKSHOP_CRATE_UNITS_PER_FAMILY,
	WORKSHOP_EMERGENCY_CRATE_UNITS_PER_FAMILY,
	WORKSHOP_MAX_PENDING_TIMER_CRATES,
	WORKSHOP_TIMER_CRATE_MINUTES
} from './constants.js';
import {
	buildEmergencySupplyCratePayload,
	buildSupplyCratePayload,
	cratePayloadCoversAllFamilies,
	cratePayloadUsesOnlyLowMidBenchStats,
	pickVariedBenchCrateResources,
	WORKSHOP_FIXED_CRATE_RESOURCE_BY_FAMILY
} from './supplyCrates.js';

describe('workshop supply crates', () => {
	it('exposes reviewed timer, craft-count, and payload constants', () => {
		expect(WORKSHOP_TIMER_CRATE_MINUTES).toBe(10);
		expect(WORKSHOP_MAX_PENDING_TIMER_CRATES).toBe(1);
		expect(WORKSHOP_CRAFT_COUNT_CRATE_INTERVAL).toBe(4);
		expect(WORKSHOP_CRATE_UNITS_PER_FAMILY).toBe(75);
		expect(WORKSHOP_EMERGENCY_CRATE_UNITS_PER_FAMILY).toBe(30);
	});

	it('builds fixed payload with one craft-useful family per line', () => {
		const payload = buildSupplyCratePayload({ mode: 'fixed' });
		expect(payload).toHaveLength(3);
		expect(cratePayloadCoversAllFamilies(payload)).toBe(true);
		expect(cratePayloadUsesOnlyLowMidBenchStats(payload)).toBe(true);
		expect(payload.every((line) => line.quantity === WORKSHOP_CRATE_UNITS_PER_FAMILY)).toBe(true);
		expect(payload.map((line) => line.resourceSlug).sort()).toEqual(
			Object.values(WORKSHOP_FIXED_CRATE_RESOURCE_BY_FAMILY).sort()
		);
	});

	it('builds varied payload from deterministic bench picks', () => {
		const variedPicks = pickVariedBenchCrateResources({ pilotId: 'pilot-1', crateSequence: 2 });
		const payload = buildSupplyCratePayload({ mode: 'varied', variedPicks });
		expect(cratePayloadCoversAllFamilies(payload)).toBe(true);
		expect(cratePayloadUsesOnlyLowMidBenchStats(payload)).toBe(true);

		const repeat = pickVariedBenchCrateResources({ pilotId: 'pilot-1', crateSequence: 2 });
		expect(repeat).toEqual(variedPicks);
	});

	it('emergency payload uses the smaller reviewed grant size', () => {
		const payload = buildEmergencySupplyCratePayload();
		expect(payload.every((line) => line.quantity === WORKSHOP_EMERGENCY_CRATE_UNITS_PER_FAMILY)).toBe(
			true
		);
	});
});
