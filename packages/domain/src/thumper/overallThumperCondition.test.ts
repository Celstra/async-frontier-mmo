import { describe, expect, it } from 'vitest';
import type { ThumperPartSnapshot } from './thumperPartTypes.js';
import {
	overallThumperCondition,
	getPartConditionBand,
	getConditionColorClass
} from './overallThumperCondition.js';

function makePartSnapshot(condition: number): ThumperPartSnapshot {
	return {
		slot: 'drill',
		itemId: 'test-item',
		schematicId: 'test-drill',
		displayName: 'Test Drill',
		propertyScores: {},
		condition,
		integrity: 100
	};
}

describe('overallThumperCondition', () => {
	it('calculates overall condition from three parts', () => {
		const result = overallThumperCondition({
			drill: { ...makePartSnapshot(80), slot: 'drill' },
			pump: { ...makePartSnapshot(70), slot: 'pump' },
			hull: { ...makePartSnapshot(90), slot: 'hull' }
		});

		// Weighted average should be around 79 (pump is lowest, gets extra weight)
		expect(result.percent).toBeGreaterThan(70);
		expect(result.percent).toBeLessThan(85);
		expect(result.weakestSlot).toBe('pump');
		expect(result.weakestPercent).toBe(70);
		expect(result.band).toBe('Solid');
	});

	it('identifies failing condition when parts are low', () => {
		const result = overallThumperCondition({
			drill: { ...makePartSnapshot(35), slot: 'drill' },
			pump: { ...makePartSnapshot(30), slot: 'pump' },
			hull: { ...makePartSnapshot(25), slot: 'hull' }
		});

		expect(result.percent).toBeLessThan(40);
		expect(result.weakestSlot).toBe('hull');
		expect(result.weakestPercent).toBe(25);
		expect(result.band).toBe('Failing');
		expect(result.displayLine).toContain('Failing');
	});

	it('identifies worn condition at mid range', () => {
		const result = overallThumperCondition({
			drill: { ...makePartSnapshot(55), slot: 'drill' },
			pump: { ...makePartSnapshot(60), slot: 'pump' },
			hull: { ...makePartSnapshot(45), slot: 'hull' }
		});

		expect(result.percent).toBeGreaterThanOrEqual(40);
		expect(result.percent).toBeLessThan(70);
		expect(result.band).toBe('Worn');
	});

	it('handles missing parts gracefully (defaults to 100)', () => {
		const result = overallThumperCondition({
			drill: { ...makePartSnapshot(50), slot: 'drill' }
			// pump and hull missing
		});

		// Missing parts default to 100, so overall is pulled up
		expect(result.percent).toBeGreaterThan(50);
		expect(result.weakestSlot).toBe('drill');
	});

	it('emphasizes the weakest part in weighted calculation', () => {
		const result1 = overallThumperCondition({
			drill: { ...makePartSnapshot(100), slot: 'drill' },
			pump: { ...makePartSnapshot(100), slot: 'pump' },
			hull: { ...makePartSnapshot(10), slot: 'hull' }
		});

		// With one very weak part, overall should be pulled down significantly
		// Weighted: 100@0.35 + 100@0.35 + 10@0.45 (hull is weakest, gets 1.5x weight)
		// = 35 + 35 + 4.5 = 74.5 / 1.15 = ~65
		expect(result1.percent).toBeLessThan(70);
		expect(result1.percent).toBeGreaterThan(40);
		expect(result1.weakestSlot).toBe('hull');
	});

	it('formats display line correctly', () => {
		const result = overallThumperCondition({
			drill: { ...makePartSnapshot(72), slot: 'drill' },
			pump: { ...makePartSnapshot(55), slot: 'pump' },
			hull: { ...makePartSnapshot(68), slot: 'hull' }
		});

		// Overall is weighted average (~63%), not a simple average
		expect(result.displayLine).toContain('63');
		expect(result.displayLine).toContain('Pump');
		expect(result.displayLine).toContain('55');
	});
});

describe('getPartConditionBand', () => {
	it('returns Solid for >=70%', () => {
		expect(getPartConditionBand(70)).toBe('Solid');
		expect(getPartConditionBand(100)).toBe('Solid');
		expect(getPartConditionBand(85)).toBe('Solid');
	});

	it('returns Worn for 40-69%', () => {
		expect(getPartConditionBand(69)).toBe('Worn');
		expect(getPartConditionBand(40)).toBe('Worn');
		expect(getPartConditionBand(55)).toBe('Worn');
	});

	it('returns Failing for <40%', () => {
		expect(getPartConditionBand(39)).toBe('Failing');
		expect(getPartConditionBand(20)).toBe('Failing');
		expect(getPartConditionBand(0)).toBe('Failing');
	});
});

describe('getConditionColorClass', () => {
	it('returns appropriate CSS classes', () => {
		expect(getConditionColorClass('Solid')).toBe('condition--solid');
		expect(getConditionColorClass('Worn')).toBe('condition--worn');
		expect(getConditionColorClass('Failing')).toBe('condition--failing');
	});
});
