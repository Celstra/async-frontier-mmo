import type { FrameId } from 'shared';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';

const ACTION_LABELS: Record<ThumperEventActionId, string> = {
	signal_tune: 'Signal Tune',
	field_repair: 'Field Repair',
	suppress_threat: 'Suppress Threat',
	clear_pump_problem: 'Clear Pump Problem'
};

/** Frame-flavored copy for the matching action button (Decision 011 verbs). */
const FRAME_ACTION_LABELS: Partial<
	Record<FrameId, Partial<Record<ThumperEventActionId, string>>>
> = {
	recon: {
		signal_tune: 'Signal Tune — sharpen the lock'
	},
	engineer: {
		field_repair: 'Field Repair — patch the hull',
		clear_pump_problem: 'Clear Pump Problem — restore flow'
	},
	vanguard: {
		suppress_threat: 'Suppress Threat — hold the line'
	}
};

export const COMPLICATION_DISPLAY_NAMES: Record<ThumperComplicationId, string> = {
	signal_drift: 'Signal Drift',
	hull_damage: 'Hull Damage',
	threat_surge: 'Threat Surge',
	pump_strain: 'Pump Strain'
};

export function eventActionLabel(actionId: ThumperEventActionId): string {
	return ACTION_LABELS[actionId];
}

export function frameFlavoredActionLabel(
	frameId: FrameId,
	actionId: ThumperEventActionId
): string {
	return FRAME_ACTION_LABELS[frameId]?.[actionId] ?? ACTION_LABELS[actionId];
}

export function complicationDisplayName(complication: ThumperComplicationId): string {
	return COMPLICATION_DISPLAY_NAMES[complication];
}
