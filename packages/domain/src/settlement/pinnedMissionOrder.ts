import { SETTLEMENT_MILESTONES, type SettlementMilestoneKey } from './milestones.js';
import { pickActiveSettlementOrder } from './orderBinding.js';
import type { SettlementOrder } from './types.js';

/**
 * Mission display order — milestone definition sequence, not binding progress.
 * Prevents the FIELD/settlement ticker from flipping when a different order binds first.
 */
export function pickPinnedMissionOrder(
	orders: ReadonlyArray<SettlementOrder>,
	milestoneKey: SettlementMilestoneKey
): SettlementOrder | null {
	const milestone = SETTLEMENT_MILESTONES.find((entry) => entry.key === milestoneKey);
	if (!milestone) {
		return pickActiveSettlementOrder(orders);
	}

	for (const definition of milestone.orders) {
		const open = orders.find(
			(order) => order.status === 'open' && order.family === definition.family
		);
		if (open) {
			return open;
		}
	}

	return null;
}
