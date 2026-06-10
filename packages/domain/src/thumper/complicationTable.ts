import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import { COMPLICATION_MATCHING_ACTION } from './complicationActions.js';

/** Locked MVP complications (Decision 005) — all four appear in seeded non-tutorial runs. */
export const THUMPER_COMPLICATIONS = [
	'signal_drift',
	'hull_damage',
	'threat_surge',
	'pump_strain'
] as const satisfies readonly ThumperComplicationId[];

export type ThumperComplicationTableRow = {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
};

/** Decision 005 complication → matching response table (frozen pair map). */
export const THUMPER_COMPLICATION_TABLE: readonly ThumperComplicationTableRow[] =
	THUMPER_COMPLICATIONS.map((complication) => ({
		complication,
		matchingAction: COMPLICATION_MATCHING_ACTION[complication]
	}));
