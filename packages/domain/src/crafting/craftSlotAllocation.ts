import type { SchematicDefinition } from './types.js';

/** Quantity already committed to other slots in this craft for the same stack. */
export function reservedQuantityForInstance(input: {
	schematic: SchematicDefinition;
	slotSelections: Record<string, string>;
	resourceInstanceId: string;
	excludeSlotId?: string;
}): number {
	let reserved = 0;

	for (const slot of input.schematic.slots) {
		if (input.excludeSlotId && slot.id === input.excludeSlotId) {
			continue;
		}
		if (input.slotSelections[slot.id] === input.resourceInstanceId) {
			reserved += slot.inputQuantity;
		}
	}

	return reserved;
}

/** Units still available from this stack for the given slot after other slot picks. */
export function availableQuantityForSlot(input: {
	schematic: SchematicDefinition;
	slotSelections: Record<string, string>;
	slotId: string;
	resourceInstanceId: string;
	stackQuantity: number;
}): number {
	const slot = input.schematic.slots.find((candidate) => candidate.id === input.slotId);
	if (!slot) {
		return 0;
	}

	const reservedElsewhere = reservedQuantityForInstance({
		schematic: input.schematic,
		slotSelections: input.slotSelections,
		resourceInstanceId: input.resourceInstanceId,
		excludeSlotId: input.slotId
	});

	return input.stackQuantity - reservedElsewhere;
}

export function canFillSlotWithStack(input: {
	schematic: SchematicDefinition;
	slotSelections: Record<string, string>;
	slotId: string;
	resourceInstanceId: string;
	stackQuantity: number;
}): boolean {
	const slot = input.schematic.slots.find((candidate) => candidate.id === input.slotId);
	if (!slot) {
		return false;
	}

	return (
		availableQuantityForSlot(input) >= slot.inputQuantity
	);
}
