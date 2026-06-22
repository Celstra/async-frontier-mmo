import {
	parseCommandQueueSlotLength,
	requiredCommandQueueScriptLength,
	type CommandQueueSlotLength
} from '@async-frontier-mmo/domain';

export function commandQueueLengthForRun(run: {
	commandQueueLength?: number | null;
}): CommandQueueSlotLength {
	return parseCommandQueueSlotLength(run.commandQueueLength);
}

export function requiredCommandsForCommandQueueRun(queueLength: CommandQueueSlotLength): number {
	return requiredCommandQueueScriptLength(queueLength);
}
