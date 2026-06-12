import { describe, expect, it } from 'vitest';
import {
	PATCHED_HULL_INTEGRITY,
	SCAVENGED_HULL_INTEGRITY,
	FIRST_ASYNC_TAIL_MINUTES
} from '../tuning.js';
import { resolveFirstAsyncWaiverActive } from './hullFailsafeRecall.js';
import { hullTierFromIntegrity, unlocksFirstAsyncTail } from './hullTier.js';
import { availableTails } from './hullRunCeiling.js';

describe('hullTierFromIntegrity', () => {
	it('uses SCAVENGED_HULL_INTEGRITY and PATCHED_HULL_INTEGRITY thresholds', () => {
		expect(hullTierFromIntegrity(SCAVENGED_HULL_INTEGRITY)).toBe('scavenged');
		expect(hullTierFromIntegrity(SCAVENGED_HULL_INTEGRITY + 1)).toBe('patched');
		expect(hullTierFromIntegrity(PATCHED_HULL_INTEGRITY)).toBe('patched');
		expect(hullTierFromIntegrity(PATCHED_HULL_INTEGRITY + 1)).toBe('basic');
	});
});

describe('first async tail unlock', () => {
	it('adds 15m only while unlock is pending', () => {
		const withoutUnlock = availableTails('patched', PATCHED_HULL_INTEGRITY);
		expect(withoutUnlock.some((tail) => tail.minutes === FIRST_ASYNC_TAIL_MINUTES)).toBe(false);

		const withUnlock = availableTails('patched', PATCHED_HULL_INTEGRITY, {
			unlockFirstAsyncTail: true
		});
		expect(withUnlock.map((tail) => tail.minutes)).toEqual([FIRST_ASYNC_TAIL_MINUTES]);
	});

	it('waives fail-safe only for the pinned first-async run', () => {
		expect(unlocksFirstAsyncTail('patched')).toBe(true);
		expect(
			resolveFirstAsyncWaiverActive({
				hullTier: 'patched',
				hullIntegrityAtDeploy: PATCHED_HULL_INTEGRITY,
				extractionTailMinutes: FIRST_ASYNC_TAIL_MINUTES,
				firstAsyncUnlockPending: true
			})
		).toBe(true);
		expect(
			resolveFirstAsyncWaiverActive({
				hullTier: 'patched',
				hullIntegrityAtDeploy: PATCHED_HULL_INTEGRITY,
				extractionTailMinutes: FIRST_ASYNC_TAIL_MINUTES,
				firstAsyncUnlockPending: false,
				waiverRunId: 'run-a',
				thumperRunId: 'run-a'
			})
		).toBe(true);
		expect(
			resolveFirstAsyncWaiverActive({
				hullTier: 'patched',
				hullIntegrityAtDeploy: PATCHED_HULL_INTEGRITY,
				extractionTailMinutes: FIRST_ASYNC_TAIL_MINUTES,
				firstAsyncUnlockPending: false,
				waiverRunId: 'run-a',
				thumperRunId: 'run-b'
			})
		).toBe(false);
		expect(
			resolveFirstAsyncWaiverActive({
				hullTier: 'patched',
				hullIntegrityAtDeploy: PATCHED_HULL_INTEGRITY,
				extractionTailMinutes: 60,
				firstAsyncUnlockPending: true
			})
		).toBe(false);
	});
});
