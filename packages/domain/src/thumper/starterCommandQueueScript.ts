import type { ThumperCommand } from './thumperCommandQueueRun.js';

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
