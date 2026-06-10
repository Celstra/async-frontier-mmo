import type { NamedResourceId } from '../resources/types.js';
import type { TuningAllocation } from './types.js';

/**
 * Decision 011 starter stockpile — ledger-recorded grants on pilot creation.
 * Decision 021-C: Survey Scanner Mk I needs 30 frame_mount + 30 crystal_lens;
 * 35 each leaves a small margin after the first guaranteed craft.
 */
export const STARTER_STOCKPILE_GRANTS: ReadonlyArray<{
	resourceId: NamedResourceId;
	quantity: number;
}> = [
	{ resourceId: 'keth_iron', quantity: 35 },
	{ resourceId: 'pale_ember_crystal', quantity: 35 }
];

/** Decision 011 first-scanner tuning default — player may change before craft. */
export const FIRST_SCANNER_SUGGESTED_TUNING: TuningAllocation = {
	survey_clarity: 2,
	stat_hint_accuracy: 1,
	signal_range: 0
};
