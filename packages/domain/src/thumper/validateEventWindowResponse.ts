import { getEventWindowResponseOptions } from './getEventWindowResponseOptions.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type { ThumperWindowChosenResponse } from './resolveThumperRunResult.js';

export type EventWindowResponseValidation =
	| { ok: true }
	| { ok: false; reason: string };

/**
 * Server-side gate for recorded window responses.
 * Rejects disabled options (e.g. Field Repair without a kit).
 */
export function validateEventWindowResponse(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	chosenResponse: ThumperWindowChosenResponse;
	fieldRepairKitCount: number;
}): EventWindowResponseValidation {
	const options = getEventWindowResponseOptions({
		complication: input.complication,
		matchingAction: input.matchingAction,
		fieldRepairKitCount: input.fieldRepairKitCount
	});

	const option = options.find((row) => row.id === input.chosenResponse);
	if (!option) {
		return { ok: false, reason: 'Response is not valid for this event window' };
	}

	if (!option.enabled) {
		return {
			ok: false,
			reason: option.disabledReason ?? 'That response is not available'
		};
	}

	return { ok: true };
}
