import { describe, expect, it } from 'vitest';
import {
	availableQuantityForSlot,
	canFillSlotWithStack,
	reservedQuantityForInstance
} from './craftSlotAllocation.js';
import { REINFORCED_HULL_PLATE } from './schematics/reinforcedHullPlate.js';

describe('craftSlotAllocation', () => {
	const selections = {
		outer_plate: 'keth-stack',
		bracing_layer: 'keth-stack'
	};

	it('sums reserved quantity across slots using the same stack', () => {
		expect(
			reservedQuantityForInstance({
				schematic: REINFORCED_HULL_PLATE,
				slotSelections: selections,
				resourceInstanceId: 'keth-stack'
			})
		).toBe(100);
	});

	it('reports available quantity for a slot after sibling reservations', () => {
		expect(
			availableQuantityForSlot({
				schematic: REINFORCED_HULL_PLATE,
				slotSelections: selections,
				slotId: 'bracing_layer',
				resourceInstanceId: 'keth-stack',
				stackQuantity: 70
			})
		).toBe(10);
	});

	it('rejects reusing one stack when combined demand exceeds quantity', () => {
		expect(
			canFillSlotWithStack({
				schematic: REINFORCED_HULL_PLATE,
				slotSelections: selections,
				slotId: 'bracing_layer',
				resourceInstanceId: 'keth-stack',
				stackQuantity: 70
			})
		).toBe(false);
	});

	it('allows reusing one stack when quantity covers both slots', () => {
		expect(
			canFillSlotWithStack({
				schematic: REINFORCED_HULL_PLATE,
				slotSelections: selections,
				slotId: 'bracing_layer',
				resourceInstanceId: 'keth-stack',
				stackQuantity: 100
			})
		).toBe(true);
	});
});
