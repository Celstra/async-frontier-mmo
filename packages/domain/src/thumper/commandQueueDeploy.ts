import { REINFORCED_HULL_PLATE } from '../crafting/schematics/reinforcedHullPlate.js';
import {
	LARGE_COMMAND_QUEUE_SLOT_LENGTH,
	MEDIUM_COMMAND_QUEUE_SLOT_LENGTH,
	STARTER_QUEUE_LENGTH,
	type CommandQueueSlotLength
} from './commandQueueSlotLength.js';

export type ThumperFrameTier = 'small' | 'medium';

export class LargeCommandQueueDeployBlockedError extends Error {
	constructor() {
		super('Large 4-slot command queue deploy is blocked until medium q3 passes playtest');
		this.name = 'LargeCommandQueueDeployBlockedError';
	}
}

export class MediumCommandQueueDeployNotAllowedError extends Error {
	constructor() {
		super('Medium 3-slot command queue deploy requires a reinforced hull plate equipped');
		this.name = 'MediumCommandQueueDeployNotAllowedError';
	}
}

/** Map equipped hull schematic to starter/small vs medium frame tier. */
export function thumperFrameTierFromHullSchematic(
	schematicId: string | null | undefined
): ThumperFrameTier {
	if (schematicId === REINFORCED_HULL_PLATE.id) {
		return 'medium';
	}
	return 'small';
}

export function commandQueueLengthForThumperFrameTier(
	tier: ThumperFrameTier
): CommandQueueSlotLength {
	return tier === 'medium' ? MEDIUM_COMMAND_QUEUE_SLOT_LENGTH : STARTER_QUEUE_LENGTH;
}

/** Medium q3 is gated on the reinforced hull payoff — worn starter hull stays on q2. */
export function isMediumCommandQueueDeployAllowed(input: {
	hullSchematicId: string | null | undefined;
}): boolean {
	return thumperFrameTierFromHullSchematic(input.hullSchematicId) === 'medium';
}

export function assertAllowedCommandQueueDeployLength(
	queueLength: number
): CommandQueueSlotLength {
	if (queueLength === LARGE_COMMAND_QUEUE_SLOT_LENGTH) {
		throw new LargeCommandQueueDeployBlockedError();
	}
	if (queueLength === MEDIUM_COMMAND_QUEUE_SLOT_LENGTH || queueLength === STARTER_QUEUE_LENGTH) {
		return queueLength;
	}
	throw new Error(`Unsupported command queue deploy length: ${queueLength}`);
}
