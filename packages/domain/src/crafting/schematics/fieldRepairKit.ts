import type { SchematicDefinition } from '../types.js';

/**
 * Field Repair Kit — Decision 010 slots with Decision 016-B Integrity Safety
 * and Decision 021-A Field Reliability weights.
 */
export const FIELD_REPAIR_KIT: SchematicDefinition = {
	id: 'field_repair_kit',
	version: 2,
	displayName: 'Field Repair Kit',
	slots: [
		{
			id: 'patch_alloy',
			displayName: 'Patch Alloy',
			requiredFamily: 'structural_alloy'
		},
		{
			id: 'control_filament',
			displayName: 'Control Filament',
			requiredFamily: 'conductive_metal'
		},
		{
			id: 'reactive_binder',
			displayName: 'Reactive Binder',
			requiredFamily: 'reactive_crystal'
		}
	],
	properties: [
		{
			id: 'condition_restored',
			displayName: 'Condition Restored',
			terms: [
				{ kind: 'slot_stat', slotId: 'patch_alloy', stat: 'malleability', weight: 0.45 },
				{ kind: 'average_oq', weight: 0.35 },
				{ kind: 'slot_stat', slotId: 'patch_alloy', stat: 'hardness', weight: 0.2 }
			]
		},
		{
			id: 'integrity_safety',
			displayName: 'Integrity Safety',
			terms: [
				{ kind: 'slot_stat', slotId: 'patch_alloy', stat: 'hardness', weight: 0.4 },
				{
					kind: 'slot_stat',
					slotId: 'reactive_binder',
					stat: 'heat_resistance',
					weight: 0.3
				},
				{ kind: 'average_oq', weight: 0.3 }
			]
		},
		{
			id: 'field_reliability',
			displayName: 'Field Reliability',
			terms: [
				{
					kind: 'slot_stat',
					slotId: 'reactive_binder',
					stat: 'heat_resistance',
					weight: 0.45
				},
				{
					kind: 'slot_stat',
					slotId: 'control_filament',
					stat: 'heat_resistance',
					weight: 0.35
				},
				{ kind: 'average_oq', weight: 0.2 }
			]
		}
	]
};

/** Decision 011-style default — player may retune before craft. */
export const FIRST_REPAIR_KIT_SUGGESTED_TUNING = {
	condition_restored: 2,
	integrity_safety: 1,
	field_reliability: 0
} as const;
