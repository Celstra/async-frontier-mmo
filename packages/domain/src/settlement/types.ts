import type { ResourceFamily } from '../resources/types.js';

export type SettlementOrderStatus = 'open' | 'filled' | 'cancelled';

export type SettlementOrder = {
	id: string;
	milestoneKey: string;
	family: ResourceFamily;
	stackSize: number;
	boundInstanceId: string | null;
	deliveredUnits: number;
	status: SettlementOrderStatus;
};
