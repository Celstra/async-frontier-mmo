import { describe, expect, it } from 'vitest';
import { bindOrderOnFirstSample, missionTrackerState } from './orderBinding.js';
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

	it('surfaces split-stack mistakes before turn-in', () => {
		const bound = {
			...baseOrder,
			boundInstanceId: 'ri_bendrel',
			deliveredUnits: 13
		};

		const state = missionTrackerState(bound, [
			{ instanceId: 'ri_bendrel', displayName: 'Bendrel Ridge Alloy', unitsSampled: 13 },
			{ instanceId: 'ri_sorrel', displayName: 'Sorrel Vein Copper', unitsSampled: 4 }
		]);

		expect(state.kind).toBe('split_stack_warning');
		if (state.kind === 'split_stack_warning') {
			expect(state.line).toContain('only one stack counts');
		}
	});
});
