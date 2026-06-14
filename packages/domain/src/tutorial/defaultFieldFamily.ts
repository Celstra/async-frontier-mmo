import type { ResourceFamily } from '../resources/types.js';
import { pickPinnedMissionOrder } from '../settlement/pinnedMissionOrder.js';
import type { SettlementMilestoneKey } from '../settlement/milestones.js';
import type { SettlementOrder } from '../settlement/types.js';

const HAND_FILLABLE_SLUG_BY_FAMILY: Partial<Record<ResourceFamily, string>> = {
	structural_alloy: 'keth_iron',
	conductive_metal: 'sorrel_vein_copper',
	reactive_crystal: 'pale_ember_crystal'
};

const FAMILY_DISPLAY: Record<ResourceFamily, string> = {
	structural_alloy: 'Structural Alloy',
	conductive_metal: 'Conductive Metal',
	reactive_crystal: 'Reactive Crystal'
};

const RESOURCE_DISPLAY: Record<string, string> = {
	keth_iron: 'Keth Iron',
	sorrel_vein_copper: 'Sorrel Vein Copper',
	pale_ember_crystal: 'Pale Ember Crystal'
};

export function defaultFieldFamilyForPinnedOrder(
	pinnedOrder: Pick<SettlementOrder, 'family'> | null
): ResourceFamily | null {
	return pinnedOrder?.family ?? null;
}

export function tutorialFieldFamilyDefault(input: {
	tutorialStep: string | null;
	pinnedOrder: Pick<SettlementOrder, 'family'> | null;
	sessionFamily: ResourceFamily | null;
	fallback: ResourceFamily;
}): ResourceFamily {
	const fromOrder = defaultFieldFamilyForPinnedOrder(input.pinnedOrder);
	const tutorialHandFill =
		input.tutorialStep === 'first_orders' ||
		input.tutorialStep === 'hunting' ||
		input.tutorialStep === 'turn_in';

	if (tutorialHandFill && fromOrder) {
		return fromOrder;
	}

	if (input.sessionFamily) {
		return input.sessionFamily;
	}

	if (fromOrder) {
		return fromOrder;
	}

	return input.fallback;
}

export function familyDisplayLabel(family: ResourceFamily): string {
	return FAMILY_DISPLAY[family];
}

export function handFillResourceSlugForFamily(family: ResourceFamily): string | null {
	return HAND_FILLABLE_SLUG_BY_FAMILY[family] ?? null;
}

export function resourceDisplayLabel(slug: string): string {
	return RESOURCE_DISPLAY[slug] ?? slug;
}

export function foremanFirstOrderLine(input: {
	pinnedOrder: Pick<SettlementOrder, 'family'> | null;
}): string {
	const family = input.pinnedOrder?.family ?? 'structural_alloy';
	const familyLabel = familyDisplayLabel(family);
	const slug = handFillResourceSlugForFamily(family);
	const resourceLabel = slug ? resourceDisplayLabel(slug) : 'the recommended signal';

	return `First order: ${familyLabel}. FIELD is tuned for ${resourceLabel} — scan the recommended signal.`;
}
