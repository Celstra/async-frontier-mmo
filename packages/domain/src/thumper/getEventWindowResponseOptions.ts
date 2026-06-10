import type {
	ThumperComplicationId,
	ThumperEventActionId,
	ThumperSafetyChoiceId
} from './types.js';

export const FIELD_REPAIR_REQUIRES_KIT_REASON =
	'Field Repair requires a Field Repair Kit. Craft one before this run (Lesson 6.2).';

export type ThumperWindowResponseOptionId =
	| ThumperEventActionId
	| ThumperSafetyChoiceId
	| 'hold';

export type ThumperWindowResponseOption = {
	id: ThumperWindowResponseOptionId;
	kind: 'matching_action' | 'hold' | 'safety_choice';
	enabled: boolean;
	disabledReason?: string;
};

/**
 * Per-window response menu: one matching action, hold, and Recall Early.
 * Field Repair is listed but disabled until the pilot owns a kit (Decision 004).
 */
export function getEventWindowResponseOptions(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	fieldRepairKitCount: number;
}): ThumperWindowResponseOption[] {
	const matchingEnabled =
		input.matchingAction !== 'field_repair' || input.fieldRepairKitCount > 0;

	const matchingOption: ThumperWindowResponseOption = {
		id: input.matchingAction,
		kind: 'matching_action',
		enabled: matchingEnabled,
		...(matchingEnabled
			? {}
			: { disabledReason: FIELD_REPAIR_REQUIRES_KIT_REASON })
	};

	return [
		matchingOption,
		{ id: 'hold', kind: 'hold', enabled: true },
		{ id: 'recall_early', kind: 'safety_choice', enabled: true }
	];
}
