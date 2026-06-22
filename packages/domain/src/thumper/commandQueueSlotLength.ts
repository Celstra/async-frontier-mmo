import { RUN_BEATS, STARTER_QUEUE_LENGTH } from './thumperCommandQueueRun.js';

export const COMMAND_QUEUE_SLOT_LENGTHS = [2, 3, 4] as const;
export type CommandQueueSlotLength = (typeof COMMAND_QUEUE_SLOT_LENGTHS)[number];

export const MEDIUM_COMMAND_QUEUE_SLOT_LENGTH = 3 as const satisfies CommandQueueSlotLength;
export const LARGE_COMMAND_QUEUE_SLOT_LENGTH = 4 as const satisfies CommandQueueSlotLength;

/** @deprecated Prefer COMMAND_QUEUE_SLOT_LENGTHS naming. */
export { STARTER_QUEUE_LENGTH };

export function isCommandQueueSlotLength(value: number): value is CommandQueueSlotLength {
	return value === 2 || value === 3 || value === 4;
}

export function parseCommandQueueSlotLength(value: number | null | undefined): CommandQueueSlotLength {
	if (value === 3 || value === 4) {
		return value;
	}
	return STARTER_QUEUE_LENGTH;
}

export function requiredCommandQueueScriptLength(
	queueLength: number,
	totalBeats: number = RUN_BEATS
): number {
	return queueLength + totalBeats - 1;
}
