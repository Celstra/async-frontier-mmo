import type { SchematicDefinition } from '../types.js';

/**
 * Efficient Pump — Decision 010 slots + Decision 021-A Field Stability
 * (Intake Manifold Malleability, not Conductivity).
 */
export const EFFICIENT_PUMP: SchematicDefinition = {
	id: 'efficient_pump',
	version: 3,
	displayName: 'Efficient Pump',
	slots: [
		{
			id: 'intake_manifold',
			displayName: 'Intake Manifold',
			requiredFamily: 'conductive_metal',
			inputQuantity: 40
		},
		{
			id: 'flexible_housing',
			displayName: 'Flexible Housing',
			requiredFamily: 'structural_alloy',
			inputQuantity: 40
		},
		{
			id: 'flow_crystal',
			displayName: 'Flow Crystal',
			requiredFamily: 'reactive_crystal',
			inputQuantity: 40
		}
	],
	properties: [
		{
			id: 'recovery_efficiency',
			displayName: 'Recovery Efficiency',
			terms: [
				{ kind: 'slot_stat', slotId: 'intake_manifold', stat: 'conductivity', weight: 0.45 },
				{ kind: 'slot_stat', slotId: 'flexible_housing', stat: 'malleability', weight: 0.35 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		},
		{
			id: 'clog_resistance',
			displayName: 'Clog Resistance',
			terms: [
				{ kind: 'slot_stat', slotId: 'flexible_housing', stat: 'malleability', weight: 0.45 },
				{ kind: 'slot_stat', slotId: 'flexible_housing', stat: 'hardness', weight: 0.3 },
				{ kind: 'average_oq', weight: 0.25 }
			]
		},
		{
			id: 'field_stability',
			displayName: 'Field Stability',
			terms: [
				{ kind: 'slot_stat', slotId: 'flow_crystal', stat: 'heat_resistance', weight: 0.45 },
				{ kind: 'slot_stat', slotId: 'intake_manifold', stat: 'malleability', weight: 0.35 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		}
	]
};
