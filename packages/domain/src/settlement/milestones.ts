import {
	NEXT_NEED_ORDER_CM_STACK,
	NEXT_NEED_ORDER_RC_STACK,
	TUTORIAL_ORDER_CM_STACK,
	TUTORIAL_ORDER_SA_STACK
} from '../tuning.js';
import type { ResourceFamily } from '../resources/types.js';

export type SettlementMilestoneKey =
	| 'fabricator_online'
	| 'next_need';

export type SettlementMilestoneDefinition = {
	key: SettlementMilestoneKey;
	label: string;
	orders: ReadonlyArray<{
		family: ResourceFamily;
		stackSize: number;
	}>;
	grantsOnComplete?: ReadonlyArray<{
		kind: 'thumper_schematic' | 'scavenged_drill' | 'scavenged_pump' | 'scavenged_hull';
	}>;
};

/** Ordered bootstrap milestones for the first-thump slice tutorial. */
export const SETTLEMENT_MILESTONES: ReadonlyArray<SettlementMilestoneDefinition> = [
	{
		key: 'fabricator_online',
		label: 'Bring the fabricator back online',
		orders: [
			{ family: 'structural_alloy', stackSize: TUTORIAL_ORDER_SA_STACK },
			{ family: 'conductive_metal', stackSize: TUTORIAL_ORDER_CM_STACK }
		],
		grantsOnComplete: [
			{ kind: 'thumper_schematic' },
			{ kind: 'scavenged_drill' },
			{ kind: 'scavenged_pump' },
			{ kind: 'scavenged_hull' }
		]
	},
	{
		key: 'next_need',
		label: 'Foreman posts the next need',
		orders: [
			{ family: 'reactive_crystal', stackSize: NEXT_NEED_ORDER_RC_STACK },
			{ family: 'conductive_metal', stackSize: NEXT_NEED_ORDER_CM_STACK }
		]
	}
];
