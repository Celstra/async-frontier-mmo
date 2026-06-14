import { REINFORCED_HULL_PLATE } from '../crafting/schematics/reinforcedHullPlate.js';
import type { ResourceFamily } from '../resources/types.js';

export type FirstHullReserve = {
	family: ResourceFamily;
	units: number;
};

export type FirstHullReserveStack = {
	resourceInstanceId: string;
	family: ResourceFamily;
	quantity: number;
};

export const FIRST_HULL_RESERVE: FirstHullReserve = (() => {
	const slot = REINFORCED_HULL_PLATE.slots.find(
		(part) => part.id === 'bonding_matrix' && part.requiredFamily === 'reactive_crystal'
	);
	if (!slot) {
		throw new Error('Reinforced Hull Plate is missing its reactive crystal bonding matrix slot');
	}

	return {
		family: slot.requiredFamily,
		units: slot.inputQuantity
	};
})();

export const FIRST_HULL_SA_RESERVE = REINFORCED_HULL_PLATE.slots
	.filter((slot) => slot.requiredFamily === 'structural_alloy')
	.reduce((total, slot) => total + slot.inputQuantity, 0);

function allocateFamilyReserve(
	stacks: ReadonlyArray<FirstHullReserveStack>,
	family: ResourceFamily,
	unitsNeeded: number
): Map<string, number> {
	const reserve = new Map<string, number>();
	let remaining = unitsNeeded;

	for (const stack of [...stacks]
		.filter((entry) => entry.family === family && entry.quantity > 0)
		.sort((left, right) => right.quantity - left.quantity)) {
		if (remaining <= 0) {
			break;
		}

		const take = Math.min(stack.quantity, remaining);
		reserve.set(stack.resourceInstanceId, take);
		remaining -= take;
	}

	return reserve;
}

export function firstHullReservedUnitsForStack(input: {
	milestoneKey: string;
	family: ResourceFamily;
	stackQuantity: number;
	ownsReinforcedHullPlate: boolean;
}): number {
	if (input.ownsReinforcedHullPlate) return 0;
	if (input.milestoneKey !== 'next_need') return 0;
	if (input.family === FIRST_HULL_RESERVE.family) {
		return Math.min(input.stackQuantity, FIRST_HULL_RESERVE.units);
	}
	if (input.family === 'structural_alloy') {
		return Math.min(input.stackQuantity, FIRST_HULL_SA_RESERVE);
	}
	return 0;
}

export function firstHullReserveMap(input: {
	milestoneKey: string;
	stacks: ReadonlyArray<FirstHullReserveStack>;
	ownsReinforcedHullPlate: boolean;
}): Map<string, number> {
	if (input.ownsReinforcedHullPlate || input.milestoneKey !== 'next_need') {
		return new Map();
	}

	const merged = new Map<string, number>();

	for (const [instanceId, units] of allocateFamilyReserve(
		input.stacks,
		FIRST_HULL_RESERVE.family,
		FIRST_HULL_RESERVE.units
	)) {
		merged.set(instanceId, units);
	}

	for (const [instanceId, units] of allocateFamilyReserve(
		input.stacks,
		'structural_alloy',
		FIRST_HULL_SA_RESERVE
	)) {
		merged.set(instanceId, (merged.get(instanceId) ?? 0) + units);
	}

	return merged;
}

export function firstHullTurnInQuantity(input: {
	milestoneKey: string;
	family: ResourceFamily;
	stackQuantity: number;
	remainingOrderUnits: number;
	reservedUnits: number;
}): number {
	const protectedFamilies =
		input.milestoneKey === 'next_need' &&
		(input.family === FIRST_HULL_RESERVE.family || input.family === 'structural_alloy');
	const availableUnits = protectedFamilies
		? Math.max(0, input.stackQuantity - input.reservedUnits)
		: input.stackQuantity;
	return Math.min(availableUnits, input.remainingOrderUnits);
}
