import type { FrameId } from 'shared';
import type { ThumperEventActionId } from './types.js';

/**
 * Extra recovery when a frame uses its specialized event action on a matching complication.
 * Data-driven — resolution reads this table instead of branching on frame id.
 */
export const FRAME_MATCHING_BONUS_RECOVERY: Record<
	FrameId,
	Partial<Record<ThumperEventActionId, number>>
> = {
	recon: { signal_tune: 5 },
	engineer: { field_repair: 5, clear_pump_problem: 6 },
	vanguard: { suppress_threat: 5 }
};

export function getFrameMatchingBonusRecovery(
	frame: FrameId,
	action: ThumperEventActionId
): number {
	return FRAME_MATCHING_BONUS_RECOVERY[frame][action] ?? 0;
}
