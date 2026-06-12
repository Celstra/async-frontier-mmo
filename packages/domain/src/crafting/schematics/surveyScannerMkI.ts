import type { SchematicDefinition, TuningAllocation } from '../types.js';

/** Decision 011 first-scanner tuning default — player may change before craft. */
export const FIRST_SCANNER_SUGGESTED_TUNING: TuningAllocation = {
	survey_clarity: 2,
	stat_hint_accuracy: 1,
	signal_range: 0
};

/**
 * Survey Scanner Module Mk I — Decision 010 slots + Decision 016-A Survey Clarity weights.
 * Slots: Conductive Core (CM), Crystal Lens (RC), Frame Mount (SA).
 */
export const SURVEY_SCANNER_MK_I: SchematicDefinition = {
	id: 'survey_scanner_mk_i',
	version: 3,
	displayName: 'Survey Scanner Module Mk I',
	slots: [
		{
			id: 'conductive_core',
			displayName: 'Conductive Core',
			requiredFamily: 'conductive_metal',
			inputQuantity: 30
		},
		{
			id: 'crystal_lens',
			displayName: 'Crystal Lens',
			requiredFamily: 'reactive_crystal',
			inputQuantity: 30
		},
		{
			id: 'frame_mount',
			displayName: 'Frame Mount',
			requiredFamily: 'structural_alloy',
			inputQuantity: 30
		}
	],
	properties: [
		{
			id: 'survey_clarity',
			displayName: 'Survey Clarity',
			terms: [
				{ kind: 'slot_stat', slotId: 'conductive_core', stat: 'conductivity', weight: 0.6 },
				{ kind: 'slot_stat', slotId: 'crystal_lens', stat: 'conductivity', weight: 0.25 },
				{ kind: 'average_oq', weight: 0.15 }
			]
		},
		{
			id: 'stat_hint_accuracy',
			displayName: 'Stat Hint Accuracy',
			terms: [
				{ kind: 'slot_stat', slotId: 'conductive_core', stat: 'conductivity', weight: 0.5 },
				{ kind: 'slot_stat', slotId: 'crystal_lens', stat: 'heat_resistance', weight: 0.3 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		},
		{
			id: 'signal_range',
			displayName: 'Signal Range',
			terms: [
				{ kind: 'slot_stat', slotId: 'conductive_core', stat: 'conductivity', weight: 0.55 },
				{ kind: 'slot_stat', slotId: 'crystal_lens', stat: 'heat_resistance', weight: 0.25 },
				{ kind: 'average_oq', weight: 0.2 }
			]
		}
	]
};
