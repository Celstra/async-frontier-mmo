import { canFillSlotWithStack, type SchematicDefinition } from '@async-frontier-mmo/domain';

export type WorkshopInventoryStack = {
	resourceInstanceId: string;
	family: string;
	quantity: number;
};

export function findNextEmptySchematicSlot(
	schematic: SchematicDefinition,
	slotSelections: Record<string, string>,
	inventory: WorkshopInventoryStack[]
): SchematicDefinition['slots'][number] | null {
	for (const slot of schematic.slots) {
		const selectedId = slotSelections[slot.id];
		if (!selectedId) {
			return slot;
		}

		const stack = inventory.find((row) => row.resourceInstanceId === selectedId);
		if (
			!stack ||
			stack.family !== slot.requiredFamily ||
			!canFillSlotWithStack({
				schematic,
				slotSelections,
				slotId: slot.id,
				resourceInstanceId: selectedId,
				stackQuantity: stack.quantity
			})
		) {
			return slot;
		}
	}

	return null;
}

export function schematicSlotPosition(
	schematic: SchematicDefinition,
	slotId: string
): number {
	const index = schematic.slots.findIndex((slot) => slot.id === slotId);
	return index >= 0 ? index + 1 : 1;
}
