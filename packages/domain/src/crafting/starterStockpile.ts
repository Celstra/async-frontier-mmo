import type { NamedResourceId } from '../resources/types.js';
import type { TuningAllocation } from './types.js';

/** Decision 011 starter stockpile — ledger-recorded grants on pilot creation. */
export const STARTER_STOCKPILE_GRANTS: ReadonlyArray<{
	resourceId: NamedResourceId;
	quantity: number;
}> = [
	{ resourceId: 'keth_iron', quantity: 12 },
	{ resourceId: 'pale_ember_crystal', quantity: 6 }
];

/** MVP consumes one unit per schematic slot (scanner and future recipes). */
export const CRAFT_QUANTITY_PER_SLOT = 1;

/** Decision 011 first-scanner tuning default — player may change before craft. */
export const FIRST_SCANNER_SUGGESTED_TUNING: TuningAllocation = {
	survey_clarity: 2,
	stat_hint_accuracy: 1,
	signal_range: 0
};
