import type { ResourceFamily } from '../resources/types.js';
import type { SchematicDefinition } from './types.js';

export type OwnedResourceStack = {
	resourceInstanceId: string;
	resourceSlug: string;
	displayName: string;
	family: ResourceFamily;
	quantity: number;
};

export type SchematicSlotReadiness = {
	slotId: string;
	familyNeeded: string;
	quantityNeeded: number;
	satisfiable: boolean;
	bestCandidate?: {
		resourceInstanceId: string;
		displayName: string;
		quantity: number;
	};
	missing?: {
		quantityShort: number;
		sourceHint: string;
	};
};

export type SchematicReadinessAnalysis = {
	slots: SchematicSlotReadiness[];
	craftableNow: boolean;
	blockers: string[];
};

const FAMILY_DISPLAY_NAMES: Record<ResourceFamily, string> = {
	conductive_metal: 'Conductive Metal',
	structural_alloy: 'Structural Alloy',
	reactive_crystal: 'Reactive Crystal'
};

function familyDisplayName(family: ResourceFamily): string {
	return FAMILY_DISPLAY_NAMES[family];
}

function sourceHintForFamily(family: ResourceFamily): string {
	const label = familyDisplayName(family);
	if (family === 'conductive_metal') {
		return `${label} comes from thumper hauls — deploy and claim a thumper on a ${label} signal.`;
	}
	return `${label} also comes from thumper hauls.`;
}

function quantityShortHint(input: {
	family: ResourceFamily;
	familyLabel: string;
	quantityShort: number;
	quantityNeeded: number;
	bestCandidate?: OwnedResourceStack;
}): string {
	const { familyLabel, quantityShort, quantityNeeded, bestCandidate } = input;
	if (bestCandidate) {
		return `Need ${quantityShort} more in one stack — claim another haul to top up ${bestCandidate.displayName} (${familyLabel}), or pick a different ${familyLabel} stack with at least ${quantityNeeded} units.`;
	}
	return sourceHintForFamily(input.family);
}

function blockerSentence(
	slot: SchematicDefinition['slots'][number],
	familyLabel: string,
	ownedQuantity: number,
	quantityShort: number,
	sourceHint: string,
	bestCandidate?: OwnedResourceStack
): string {
	if (ownedQuantity <= 0) {
		return `${slot.displayName} needs ${slot.inputQuantity} ${familyLabel} — you have none. ${sourceHint}`;
	}
	if (bestCandidate && bestCandidate.quantity < slot.inputQuantity) {
		return `${slot.displayName} needs ${slot.inputQuantity} ${familyLabel} in one stack — ${bestCandidate.displayName} only has ${bestCandidate.quantity} (${quantityShort} short). ${sourceHint}`;
	}
	return `${slot.displayName} needs ${slot.inputQuantity} ${familyLabel} — you only have ${ownedQuantity} (${quantityShort} short). ${sourceHint}`;
}

/**
 * Per-slot craft readiness — which families are missing, from where, and whether
 * the pilot can fill each slot from owned stacks right now.
 */
export function analyzeSchematicReadiness(input: {
	schematic: SchematicDefinition;
	ownedStacks: readonly OwnedResourceStack[];
}): SchematicReadinessAnalysis {
	const slots: SchematicSlotReadiness[] = [];
	const blockers: string[] = [];

	for (const slot of input.schematic.slots) {
		const familyLabel = familyDisplayName(slot.requiredFamily);
		const familyStacks = input.ownedStacks
			.filter((stack) => stack.family === slot.requiredFamily)
			.sort((left, right) => right.quantity - left.quantity);

		const bestCandidate = familyStacks[0];
		const ownedInBest = bestCandidate?.quantity ?? 0;
		const totalFamilyQuantity = familyStacks.reduce((sum, stack) => sum + stack.quantity, 0);
		const sourceHint = sourceHintForFamily(slot.requiredFamily);

		if (bestCandidate && ownedInBest >= slot.inputQuantity) {
			slots.push({
				slotId: slot.id,
				familyNeeded: familyLabel,
				quantityNeeded: slot.inputQuantity,
				satisfiable: true,
				bestCandidate: {
					resourceInstanceId: bestCandidate.resourceInstanceId,
					displayName: bestCandidate.displayName,
					quantity: bestCandidate.quantity
				}
			});
			continue;
		}

		const quantityShort = bestCandidate
			? Math.max(0, slot.inputQuantity - bestCandidate.quantity)
			: totalFamilyQuantity > 0
				? Math.max(0, slot.inputQuantity - totalFamilyQuantity)
				: slot.inputQuantity;

		const shortHint = quantityShortHint({
			family: slot.requiredFamily,
			familyLabel,
			quantityShort,
			quantityNeeded: slot.inputQuantity,
			bestCandidate
		});

		const blocker = blockerSentence(
			slot,
			familyLabel,
			bestCandidate?.quantity ?? totalFamilyQuantity,
			quantityShort,
			shortHint,
			bestCandidate
		);
		blockers.push(blocker);

		slots.push({
			slotId: slot.id,
			familyNeeded: familyLabel,
			quantityNeeded: slot.inputQuantity,
			satisfiable: false,
			bestCandidate: bestCandidate
				? {
						resourceInstanceId: bestCandidate.resourceInstanceId,
						displayName: bestCandidate.displayName,
						quantity: bestCandidate.quantity
					}
				: undefined,
			missing: {
				quantityShort,
				sourceHint: shortHint
			}
		});
	}

	return {
		slots,
		craftableNow: blockers.length === 0,
		blockers
	};
}
