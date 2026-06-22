import { describe, expect, it } from 'vitest';
import {
	assertCommandQueuePolicyGate,
	buildCommandQueuePolicyReport,
	COMMAND_QUEUE_POLICY_NAMES,
	simulateCommandQueuePolicyRun
} from './commandQueuePolicySim.js';
import { MEDIUM_COMMAND_QUEUE_SLOT_LENGTH } from './commandQueueSlotLength.js';

describe('commandQueuePolicySim', () => {
	it('runs each policy through the live command-queue domain rules', () => {
		const result = simulateCommandQueuePolicyRun({
			runSeed: 'policy-sim-smoke',
			queueLength: 3,
			scannerQuality: 'basic',
			policy: 'planner'
		});

		expect(result.recovered).toBeGreaterThanOrEqual(0);
		expect(result.score).toBe(result.recovered - result.repairDebt);
		expect(result.commandCounts.drill + result.commandCounts.bank).toBeGreaterThan(0);
	});

	it('keeps oracle at or above planner on a fixed seed', () => {
		const planner = simulateCommandQueuePolicyRun({
			runSeed: 'policy-oracle-check',
			queueLength: 3,
			scannerQuality: 'basic',
			policy: 'planner'
		});
		const oracle = simulateCommandQueuePolicyRun({
			runSeed: 'policy-oracle-check',
			queueLength: 3,
			scannerQuality: 'basic',
			policy: 'oracle'
		});

		expect(oracle.score).toBeGreaterThanOrEqual(planner.score);
	});

	it('q3 policy gates pass across poor/basic/good scanners', () => {
		const report = assertCommandQueuePolicyGate({
			queueLength: MEDIUM_COMMAND_QUEUE_SLOT_LENGTH,
			sampleSize: 240,
			baseSeed: 20260623
		});

		expect(report.queueLength).toBe(3);
		expect(report.gateFailures).toEqual([]);
		expect(COMMAND_QUEUE_POLICY_NAMES.every((name) =>
			report.policies.some((policy) => policy.name === name)
		)).toBe(true);

		const basicPlanner = report.policies.find(
			(policy) => policy.name === 'planner' && policy.scannerQuality === 'basic'
		);
		const basicGreedy = report.policies.find(
			(policy) => policy.name === 'greedy' && policy.scannerQuality === 'basic'
		);
		expect(basicPlanner?.medianScore).toBeGreaterThan(basicGreedy?.medianScore ?? Number.NEGATIVE_INFINITY);
		expect(report.hullDamageGuidance.suggestedFollowUp).not.toBe('defer');
	});

	it('reports policy score bands for inspection without throwing', () => {
		const report = buildCommandQueuePolicyReport({
			queueLength: 3,
			sampleSize: 24,
			baseSeed: 77
		});

		expect(report.policies.length).toBe(COMMAND_QUEUE_POLICY_NAMES.length * 3);
		expect(report.hullDamageGuidance.rationale.length).toBeGreaterThan(0);
	});
});
