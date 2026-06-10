import type { SchematicDefinition } from '../types.js';

/** Basic Drill Head — Decision 010 slots and weights (Drill thumper slot). */
export const BASIC_DRILL_HEAD: SchematicDefinition = {
	id: 'basic_drill_head',
	version: 2,
	displayName: 'Basic Drill Head',
	slots: [
		{
			id: 'cutting_bit',
			displayName: 'Cutting Bit',
			requiredFamily: 'structural_alloy',
			inputQuantity: 40
		},
		{
			id: 'conductive_coil',
			displayName: 'Conductive Coil',
			requiredFamily: 'conductive_metal',
			inputQuantity: 40
		},
		{
			id: 'resonance_crystal',
			displayName: 'Resonance Crystal',
			requiredFamily: 'reactive_crystal',
			inputQuantity: 40
		}
	],
	properties: [
		{
			id: 'extraction_rate',
			displayName: 'Extraction Rate',
			terms: [
				{ kind: 'slot_stat', slotId: 'cutting_bit', stat: 'hardness', weight: 0.5 },
				{ kind: 'slot_stat', slotId: 'conductive_coil', stat: 'conductivity', weight: 0.3 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		},
		{
			id: 'depth_access',
			displayName: 'Depth Access',
			terms: [
				{ kind: 'slot_stat', slotId: 'cutting_bit', stat: 'hardness', weight: 0.5 },
				{ kind: 'slot_stat', slotId: 'resonance_crystal', stat: 'heat_resistance', weight: 0.3 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		},
		{
			id: 'wear_control',
			displayName: 'Wear Control',
			terms: [
				{ kind: 'slot_stat', slotId: 'resonance_crystal', stat: 'heat_resistance', weight: 0.45 },
				{ kind: 'slot_stat', slotId: 'cutting_bit', stat: 'malleability', weight: 0.35 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		}
	]
};
