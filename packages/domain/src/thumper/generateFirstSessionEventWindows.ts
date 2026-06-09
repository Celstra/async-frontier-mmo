import type { NamedResourceId } from '../resources/types.js';
import {
	COMPLICATION_MATCHING_ACTION,
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES
} from './complicationActions.js';
import type { ThumperEventWindowPlan } from './types.js';

const FIRST_SESSION_TARGET: NamedResourceId = 'veyrith_copper';

const FIRST_SESSION_COMPLICATIONS = ['signal_drift', 'pump_strain'] as const;

/**
 * Decision 011 — first tutorial run on recommended Veyrith Copper:
 * exactly two windows, deterministic order, no RNG.
 */
export function generateFirstSessionEventWindows(input: {
	targetResourceId: NamedResourceId;
}): ThumperEventWindowPlan {
	if (input.targetResourceId !== FIRST_SESSION_TARGET) {
		throw new Error(
			`First-session event windows are only defined for ${FIRST_SESSION_TARGET}`
		);
	}

	const windows = FIRST_SESSION_COMPLICATIONS.map((complication, index) => ({
		windowIndex: index + 1,
		complication,
		matchingAction: COMPLICATION_MATCHING_ACTION[complication]
	}));

	return {
		windows,
		eventActions: THUMPER_EVENT_ACTIONS,
		safetyChoices: THUMPER_SAFETY_CHOICES
	};
}
