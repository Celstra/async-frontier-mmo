import type { ThumperCommand } from './thumperCommandQueueRun.js';
import { STARTER_QUEUE_LENGTH } from './thumperCommandQueueRun.js';
import {
	requiredCommandQueueScriptLength,
	type CommandQueueSlotLength
} from './commandQueueSlotLength.js';

/** Browser/DB smoke seed for FIELD command-queue runs. */
export const FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED = 'field-command-queue-smoke-seed';

/** Full starter-queue script: 2 visible slots across 18 beats (19 committed commands). */
export const STARTER_COMMAND_QUEUE_SCRIPT = [
	'drill',
	'bank',
	'vent',
	'drill',
	'bank',
	'brace',
	'drill',
	'vent',
	'bank',
	'drill',
	'brace',
	'vent',
	'drill',
	'bank',
	'drill',
	'vent',
	'bank',
	'drill',
	'brace'
] as const satisfies readonly ThumperCommand[];

export function starterScriptForQueueLength(
	queueLength: CommandQueueSlotLength
): ThumperCommand[] {
	const requiredLength = requiredCommandQueueScriptLength(queueLength);
	const base = [...STARTER_COMMAND_QUEUE_SCRIPT];
	const script: ThumperCommand[] = [];

	for (let index = 0; index < requiredLength; index += 1) {
		script.push(base[index % base.length]!);
	}

	return script;
}

export function assertStarterScriptLength(queueLength: CommandQueueSlotLength): void {
	const requiredLength = requiredCommandQueueScriptLength(queueLength);
	if (queueLength === STARTER_QUEUE_LENGTH) {
		if (STARTER_COMMAND_QUEUE_SCRIPT.length !== requiredLength) {
			throw new Error(
				`STARTER_COMMAND_QUEUE_SCRIPT length ${STARTER_COMMAND_QUEUE_SCRIPT.length} does not match required ${requiredLength}`
			);
		}
		return;
	}

	const expanded = starterScriptForQueueLength(queueLength);
	if (expanded.length !== requiredLength) {
		throw new Error(
			`starter script for queue length ${queueLength} expected ${requiredLength} commands, got ${expanded.length}`
		);
	}
}
