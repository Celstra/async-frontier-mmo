import { describe, expect, it } from 'vitest';
import { getStatBand } from './statBand.js';

describe('getStatBand', () => {
	it('maps Decision 010 band boundaries', () => {
		expect(getStatBand(1)).toBe('poor');
		expect(getStatBand(249)).toBe('poor');
		expect(getStatBand(250)).toBe('weak');
		expect(getStatBand(499)).toBe('weak');
		expect(getStatBand(500)).toBe('solid');
		expect(getStatBand(649)).toBe('solid');
		expect(getStatBand(650)).toBe('strong');
		expect(getStatBand(799)).toBe('strong');
		expect(getStatBand(800)).toBe('excellent');
		expect(getStatBand(899)).toBe('excellent');
		expect(getStatBand(900)).toBe('exceptional');
		expect(getStatBand(1000)).toBe('exceptional');
	});

	it('classifies Veyrith Copper Conductivity and Hardness for survey hints', () => {
		expect(getStatBand(930)).toBe('exceptional');
		expect(getStatBand(260)).toBe('weak');
	});
});
