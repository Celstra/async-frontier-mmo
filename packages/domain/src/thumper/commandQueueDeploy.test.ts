import { describe, expect, it } from 'vitest';
import { REINFORCED_HULL_PLATE } from '../crafting/schematics/reinforcedHullPlate.js';
import {
	LARGE_COMMAND_QUEUE_SLOT_LENGTH,
	MEDIUM_COMMAND_QUEUE_SLOT_LENGTH,
	STARTER_QUEUE_LENGTH
} from './commandQueueSlotLength.js';
import {
	assertAllowedCommandQueueDeployLength,
	commandQueueLengthForThumperFrameTier,
	isMediumCommandQueueDeployAllowed,
	LargeCommandQueueDeployBlockedError,
	MediumCommandQueueDeployNotAllowedError,
	thumperFrameTierFromHullSchematic
} from './commandQueueDeploy.js';

describe('commandQueueDeploy', () => {
	it('maps worn starter hull to small/q2 and reinforced hull to medium/q3', () => {
		expect(thumperFrameTierFromHullSchematic('worn_basic_hull')).toBe('small');
		expect(commandQueueLengthForThumperFrameTier('small')).toBe(STARTER_QUEUE_LENGTH);
		expect(thumperFrameTierFromHullSchematic(REINFORCED_HULL_PLATE.id)).toBe('medium');
		expect(commandQueueLengthForThumperFrameTier('medium')).toBe(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH);
	});

	it('gates medium deploy on reinforced hull plate equipped', () => {
		expect(isMediumCommandQueueDeployAllowed({ hullSchematicId: 'worn_basic_hull' })).toBe(false);
		expect(isMediumCommandQueueDeployAllowed({ hullSchematicId: REINFORCED_HULL_PLATE.id })).toBe(
			true
		);
		expect(() => {
			if (!isMediumCommandQueueDeployAllowed({ hullSchematicId: 'worn_basic_hull' })) {
				throw new MediumCommandQueueDeployNotAllowedError();
			}
		}).toThrow(MediumCommandQueueDeployNotAllowedError);
	});

	it('blocks 4-slot deploy length', () => {
		expect(() => assertAllowedCommandQueueDeployLength(LARGE_COMMAND_QUEUE_SLOT_LENGTH)).toThrow(
			LargeCommandQueueDeployBlockedError
		);
		expect(assertAllowedCommandQueueDeployLength(STARTER_QUEUE_LENGTH)).toBe(STARTER_QUEUE_LENGTH);
		expect(assertAllowedCommandQueueDeployLength(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH)).toBe(
			MEDIUM_COMMAND_QUEUE_SLOT_LENGTH
		);
	});
});
