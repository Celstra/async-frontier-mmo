import { describe, expect, it } from 'vitest';
import { availableTails, maxRunMinutes } from './hullRunCeiling.js';
import { PATCHED_HULL_INTEGRITY } from '../tuning.js';

describe('hullRunCeiling', () => {
	it('approximates 2 minutes for scavenged hull at 5% integrity', () => {
		const minutes = maxRunMinutes('scavenged', 5);
		expect(minutes).toBeGreaterThanOrEqual(1.8);
		expect(minutes).toBeLessThanOrEqual(2.2);
	});

	it('approximates 7 minutes for patched hull at 30% integrity', () => {
		const minutes = maxRunMinutes('patched', 30);
		expect(minutes).toBeGreaterThanOrEqual(6.5);
		expect(minutes).toBeLessThanOrEqual(7.5);
	});

	it('approximates 184 minutes for basic crafted hull at 80% integrity', () => {
		const minutes = maxRunMinutes('basic', 80);
		expect(minutes).toBeGreaterThanOrEqual(180);
		expect(minutes).toBeLessThanOrEqual(188);
	});

	it('offers emergency 5m tail for patched hull before first hull plate', () => {
		const tails = availableTails('patched', PATCHED_HULL_INTEGRITY, {
			allowFirstHullEmergencyRun: true
		});
		expect(tails.some((tail) => tail.minutes === 5)).toBe(true);
	});
});
