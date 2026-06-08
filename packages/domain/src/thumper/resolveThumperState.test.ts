import { describe, expect, it } from 'vitest';
import { resolveThumperState } from './resolveThumperState.js';

const deployedAt = new Date('2024-01-01T00:00:00.000Z');
const durationSeconds = 60;

describe('resolveThumperState', () => {
	it('is active with positive seconds remaining before completion', () => {
		const result = resolveThumperState({
			deployedAt,
			durationSeconds,
			now: new Date('2024-01-01T00:00:30.000Z')
		});

		expect(result).toEqual({
			status: 'active',
			secondsRemaining: 30
		});
	});

	it('is claimable with zero seconds remaining at completion', () => {
		const result = resolveThumperState({
			deployedAt,
			durationSeconds,
			now: new Date('2024-01-01T00:01:00.000Z')
		});

		expect(result).toEqual({
			status: 'claimable',
			secondsRemaining: 0
		});
	});

	it('is claimable with zero seconds remaining after completion', () => {
		const result = resolveThumperState({
			deployedAt,
			durationSeconds,
			now: new Date('2024-01-01T00:02:00.000Z')
		});

		expect(result).toEqual({
			status: 'claimable',
			secondsRemaining: 0
		});
	});
});
