import { describe, expect, it } from 'vitest';
import { pickPinnedMissionOrder } from './pinnedMissionOrder.js';
import type { SettlementOrder } from './types.js';

function order(partial: Partial<SettlementOrder> & Pick<SettlementOrder, 'id' | 'family'>): SettlementOrder {
	return {
		milestoneKey: 'next_need',
		stackSize: 12,
		boundInstanceId: null,
		deliveredUnits: 0,
		status: 'open',
		...partial
	};
}

describe('pickPinnedMissionOrder', () => {
	it('returns RC before CM for next_need regardless of binding progress', () => {
		const orders = [
			order({
				id: 'cm',
				family: 'conductive_metal',
				stackSize: 18,
				boundInstanceId: 'cm-stack',
				deliveredUnits: 10
			}),
			order({
				id: 'rc',
				family: 'reactive_crystal',
				stackSize: 12,
				boundInstanceId: null,
				deliveredUnits: 0
			})
		];

		expect(pickPinnedMissionOrder(orders, 'next_need')?.id).toBe('rc');
	});
});
