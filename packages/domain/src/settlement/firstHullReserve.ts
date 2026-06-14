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

export function firstHullReservedUnitsForStack(input: {
	milestoneKey: string;
	family: ResourceFamily;
	stackQuantity: number;
	ownsReinforcedHullPlate: boolean;
}): number {
	if (input.ownsReinforcedHullPlate) return 0;
	if (input.milestoneKey !== 'next_need') return 0;
	if (input.family !== FIRST_HULL_RESERVE.family) return 0;
	return Math.min(input.stackQuantity, FIRST_HULL_RESERVE.units);
}

export function firstHullReserveMap(input: {
	milestoneKey: string;
	stacks: ReadonlyArray<FirstHullReserveStack>;
	ownsReinforcedHullPlate: boolean;
}): Map<string, number> {
	if (input.ownsReinforcedHullPlate || input.milestoneKey !== 'next_need') {
		return new Map();
	}

	const [reserveStack] = input.stacks
		.filter((stack) => stack.family === FIRST_HULL_RESERVE.family && stack.quantity > 0)
		.sort((left, right) => right.quantity - left.quantity);
	if (!reserveStack) {
		return new Map();
	}

	return new Map([
		[reserveStack.resourceInstanceId, Math.min(reserveStack.quantity, FIRST_HULL_RESERVE.units)]
	]);
}

export function firstHullTurnInQuantity(input: {
	milestoneKey: string;
	family: ResourceFamily;
	stackQuantity: number;
	remainingOrderUnits: number;
	reservedUnits: number;
}): number {
	const availableUnits =
		input.milestoneKey === 'next_need' && input.family === FIRST_HULL_RESERVE.family
			? Math.max(0, input.stackQuantity - input.reservedUnits)
			: input.stackQuantity;
	return Math.min(availableUnits, input.remainingOrderUnits);
}
