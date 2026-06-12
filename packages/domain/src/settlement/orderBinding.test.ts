import { describe, expect, it } from 'vitest';
import {
	bindOrderOnFirstSample,
	boundStackProgress,
	missionTrackerState,
	pickActiveSettlementOrder
} from './orderBinding.js';
import type { SettlementOrder } from './types.js';

const baseOrder: SettlementOrder = {
	id: 'order-1',
	milestoneKey: 'fabricator_online',
	family: 'structural_alloy',
	stackSize: 20,
	boundInstanceId: null,
	deliveredUnits: 0,
	status: 'open'
};

describe('orderBinding', () => {
	it('binds to the first sampled resource in the family', () => {
		const bound = bindOrderOnFirstSample(baseOrder, {
			instanceId: 'ri_bendrel',
			family: 'structural_alloy'
		});

		expect(bound.boundInstanceId).toBe('ri_bendrel');
	});

	it('shows family-level tracker copy until bound', () => {
		const state = missionTrackerState(baseOrder, []);
		expect(state.kind).toBe('unbound');
		if (state.kind === 'unbound') {
			expect(state.line).toContain('ONE Structural Alloy stack');
		}
	});

	it('counts sampled bound-stack inventory toward progress before turn-in', () => {
		const bound = {
			...baseOrder,
			boundInstanceId: 'ri_bendrel',
			deliveredUnits: 0
		};

		const state = missionTrackerState(bound, [
			{ instanceId: 'ri_bendrel', displayName: 'Bendrel Ridge Alloy', unitsSampled: 13 }
		]);

		expect(boundStackProgress(bound, [
			{ instanceId: 'ri_bendrel', displayName: 'Bendrel Ridge Alloy', unitsSampled: 13 }
		])).toBe(13);
		expect(state.kind).toBe('bound');
		if (state.kind === 'bound') {
			expect(state.line).toBe('BENDREL RIDGE ALLOY — 13/20 — single stack');
			expect(state.nudge).toBe('7 more Bendrel Ridge Alloy completes this order. Stacks can\'t mix.');
		}
	});

	it('hides the bound-order nudge after it has been shown once', () => {
		const bound = {
			...baseOrder,
			boundInstanceId: 'ri_bendrel',
			deliveredUnits: 0
		};
		const candidates = [
			{ instanceId: 'ri_bendrel', displayName: 'Bendrel Ridge Alloy', unitsSampled: 13 }
		];

		const first = missionTrackerState(bound, candidates, { nudgeShown: false });
		expect(first.kind).toBe('bound');
		if (first.kind === 'bound') {
			expect(first.nudge).toContain('7 more');
		}

		const after = missionTrackerState(bound, candidates, { nudgeShown: true });
		expect(after.kind).toBe('bound');
		if (after.kind === 'bound') {
			expect(after.nudge).toBeNull();
		}
	});

	it('surfaces split-stack mistakes before turn-in', () => {
		const bound = {
			...baseOrder,
			boundInstanceId: 'ri_bendrel',
			deliveredUnits: 0
		};

		const state = missionTrackerState(bound, [
			{ instanceId: 'ri_bendrel', displayName: 'Bendrel Ridge Alloy', unitsSampled: 13 },
			{ instanceId: 'ri_sorrel', displayName: 'Sorrel Vein Copper', unitsSampled: 4 }
		]);

		expect(state.kind).toBe('split_stack_warning');
		if (state.kind === 'split_stack_warning') {
			expect(state.primaryUnits).toBe(13);
			expect(state.line).toContain('BENDREL RIDGE ALLOY 13/20');
			expect(state.line).toContain('only one stack counts');
		}
	});

	it('uses delivered units for split-stack progress, not remaining inventory', () => {
		const bound = {
			...baseOrder,
			boundInstanceId: 'ri_bendrel',
			deliveredUnits: 20
		};

		const state = missionTrackerState(bound, [
			{ instanceId: 'ri_bendrel', displayName: 'Bendrel Ridge Alloy', unitsSampled: 5 },
			{ instanceId: 'ri_keth', displayName: 'Keth Iron', unitsSampled: 8 }
		]);

		expect(state.kind).toBe('split_stack_warning');
		if (state.kind === 'split_stack_warning') {
			expect(state.primaryUnits).toBe(20);
			expect(state.line).toContain('BENDREL RIDGE ALLOY 20/20');
		}
	});

	it('prefers a bound open order for the active mission ticker', () => {
		const orders: SettlementOrder[] = [
			baseOrder,
			{
				...baseOrder,
				id: 'order-2',
				family: 'conductive_metal',
				boundInstanceId: 'ri_veyrith',
				deliveredUnits: 0
			}
		];

		expect(pickActiveSettlementOrder(orders)?.id).toBe('order-2');
	});
});
