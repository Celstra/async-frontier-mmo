import type { ThumperComplicationId, ThumperEventActionId } from './types.js';

export const THUMPER_EVENT_ACTIONS = [
	'signal_tune',
	'field_repair',
	'suppress_threat',
	'clear_pump_problem'
] as const satisfies readonly ThumperEventActionId[];

export const THUMPER_SAFETY_CHOICES = ['recall_early'] as const;

export const COMPLICATION_MATCHING_ACTION: Record<
	ThumperComplicationId,
	ThumperEventActionId
> = {
	signal_drift: 'signal_tune',
	hull_damage: 'field_repair',
	threat_surge: 'suppress_threat',
	pump_strain: 'clear_pump_problem'
};

export function getMatchingAction(
	complication: ThumperComplicationId
): ThumperEventActionId {
	return COMPLICATION_MATCHING_ACTION[complication];
}
