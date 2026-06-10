import type { SchematicDefinition } from '../types.js';

/** Reinforced Hull Plate — Decision 010 slots and weights (Hull thumper slot). */
export const REINFORCED_HULL_PLATE: SchematicDefinition = {
	id: 'reinforced_hull_plate',
	version: 2,
	displayName: 'Reinforced Hull Plate',
	slots: [
		{
			id: 'outer_plate',
			displayName: 'Outer Plate',
			requiredFamily: 'structural_alloy',
			inputQuantity: 60
		},
		{
			id: 'bracing_layer',
			displayName: 'Bracing Layer',
			requiredFamily: 'structural_alloy',
			inputQuantity: 40
		},
		{
			id: 'bonding_matrix',
			displayName: 'Bonding Matrix',
			requiredFamily: 'reactive_crystal',
			inputQuantity: 20
		}
	],
	properties: [
		{
			id: 'max_condition',
			displayName: 'Max Condition',
			terms: [
				{ kind: 'slot_stat', slotId: 'outer_plate', stat: 'hardness', weight: 0.45 },
				{ kind: 'slot_stat', slotId: 'bracing_layer', stat: 'malleability', weight: 0.3 },
				{ kind: 'average_oq', weight: 0.25 }
			]
		},
		{
			id: 'damage_reduction',
			displayName: 'Damage Reduction',
			terms: [
				{ kind: 'slot_stat', slotId: 'outer_plate', stat: 'hardness', weight: 0.5 },
				{ kind: 'slot_stat', slotId: 'bonding_matrix', stat: 'heat_resistance', weight: 0.3 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		},
		{
			id: 'repairability',
			displayName: 'Repairability',
			terms: [
				{ kind: 'slot_stat', slotId: 'bracing_layer', stat: 'malleability', weight: 0.45 },
				{ kind: 'average_oq', weight: 0.35 },
				{ kind: 'slot_stat', slotId: 'outer_plate', stat: 'hardness', weight: 0.2 }
			]
		}
	]
};
