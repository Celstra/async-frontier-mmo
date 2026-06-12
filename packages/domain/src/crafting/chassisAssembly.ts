import { thumperPartSlotForSchematic } from '../thumper/thumperPartSchematics.js';
import {
	THUMPER_CHASSIS_ASSEMBLY,
	type ChassisAssemblySlotId
} from './schematics/thumperChassisAssembly.js';

export type OwnedThumperPart = {
	itemId: string;
	schematicId: string;
	displayName: string;
	slot: ChassisAssemblySlotId;
	condition: number;
	integrity: number;
};

export type ChassisSlotReadiness = {
	slotId: ChassisAssemblySlotId;
	displayName: string;
	satisfiable: boolean;
	candidates: OwnedThumperPart[];
};

export type ChassisAssemblyReadiness = {
	slots: ChassisSlotReadiness[];
	assemblableNow: boolean;
	blockers: string[];
};

function partsForSocket(
	ownedParts: ReadonlyArray<OwnedThumperPart>,
	partSlot: ChassisAssemblySlotId
): OwnedThumperPart[] {
	return ownedParts.filter((part) => part.slot === partSlot);
}

export function analyzeChassisAssemblyReadiness(input: {
	ownedParts: ReadonlyArray<OwnedThumperPart>;
}): ChassisAssemblyReadiness {
	const blockers: string[] = [];
	const slots = THUMPER_CHASSIS_ASSEMBLY.slots.map((slot) => {
		const candidates = partsForSocket(input.ownedParts, slot.partSlot);
		const satisfiable = candidates.length > 0;
		if (!satisfiable) {
			blockers.push(`${slot.displayName} needs a ${slot.partSlot} part — none in inventory.`);
		}
		return {
			slotId: slot.id,
			displayName: slot.displayName,
			satisfiable,
			candidates
		};
	});

	return {
		slots,
		assemblableNow: blockers.length === 0,
		blockers
	};
}

export function validateChassisAssembly(input: {
	selections: Partial<Record<ChassisAssemblySlotId, string>>;
	ownedParts: ReadonlyArray<OwnedThumperPart>;
}):
	| { valid: true; selections: Record<ChassisAssemblySlotId, string> }
	| { valid: false; reason: string } {
	const resolved: Partial<Record<ChassisAssemblySlotId, string>> = {};
	const usedItemIds = new Set<string>();

	for (const slot of THUMPER_CHASSIS_ASSEMBLY.slots) {
		const itemId = input.selections[slot.id];
		if (!itemId) {
			return { valid: false, reason: `Select a part for ${slot.displayName}` };
		}

		if (usedItemIds.has(itemId)) {
			return { valid: false, reason: 'Each socket needs a different part' };
		}

		const part = input.ownedParts.find((row) => row.itemId === itemId);
		if (!part) {
			return { valid: false, reason: 'Selected part is not in your inventory' };
		}

		if (part.slot !== slot.partSlot) {
			return { valid: false, reason: `${part.displayName} does not fit ${slot.displayName}` };
		}

		const schematicSlot = thumperPartSlotForSchematic(part.schematicId);
		if (schematicSlot !== slot.partSlot) {
			return { valid: false, reason: `${part.displayName} is not a ${slot.partSlot} part` };
		}

		usedItemIds.add(itemId);
		resolved[slot.id] = itemId;
	}

	return {
		valid: true,
		selections: resolved as Record<ChassisAssemblySlotId, string>
	};
}
