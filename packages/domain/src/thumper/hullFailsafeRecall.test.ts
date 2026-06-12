import { describe, expect, it } from 'vitest';
import { computeHullFailsafeProrata } from './hullFailsafeRecall.js';

describe('hullFailsafeRecall', () => {
	it('pro-rates projected recovery when planned duration exceeds hull ceiling', () => {
		const result = computeHullFailsafeProrata({
			hullTier: 'scavenged',
			hullIntegrityAtDeploy: 5,
			plannedDurationSeconds: 15 * 60,
			projectedRecovery: 60
		});

		expect(result.triggered).toBe(true);
		if (!result.triggered) {
			return;
		}

		expect(result.recallReason).toBe('hull_failsafe');
		expect(result.prorataProjectedRecovery).toBeLessThan(60);
		expect(result.prorataProjectedRecovery).toBeGreaterThan(0);
	});

	it('does not trigger when planned duration fits within hull ceiling', () => {
		const result = computeHullFailsafeProrata({
			hullTier: 'patched',
			hullIntegrityAtDeploy: 30,
			plannedDurationSeconds: 5 * 60,
			projectedRecovery: 60
		});

		expect(result.triggered).toBe(false);
	});
});
