import { describe, expect, it } from 'vitest';
import { getPropertyOutputBand } from './propertyBand.js';

describe('getPropertyOutputBand', () => {
	it('uses Decision 010 crafted property bands', () => {
		expect(getPropertyOutputBand(0)).toBe('poor');
		expect(getPropertyOutputBand(69)).toBe('solid');
		expect(getPropertyOutputBand(95)).toBe('exceptional');
	});
});
