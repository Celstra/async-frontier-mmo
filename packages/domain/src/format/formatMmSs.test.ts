import { describe, expect, it } from 'vitest';
import { formatMmSs } from './formatMmSs.js';

describe('formatMmSs', () => {
	it('floors fractional seconds', () => {
		expect(formatMmSs(123.588)).toBe('2:03');
		expect(formatMmSs(424.441666)).toBe('7:04');
	});

	it('pads single-digit seconds', () => {
		expect(formatMmSs(65)).toBe('1:05');
	});
});
