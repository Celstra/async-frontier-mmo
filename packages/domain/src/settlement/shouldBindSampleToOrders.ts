import type { ResourceFamily } from '../resources/types.js';
import { handFillResourceSlugForFamily } from '../tutorial/defaultFieldFamily.js';

const TUTORIAL_HAND_FILL_STEPS = new Set(['first_orders', 'hunting', 'turn_in']);

/** Tutorial hand-fill free samples bind immediately; paid samples always bind. */
export function shouldBindSampleToOrders(input: {
	energyCost: number;
	tutorialStep: string | null;
	pinnedOrderFamily: ResourceFamily | null;
	sampledResourceSlug: string;
}): boolean {
	if (input.energyCost > 0) {
		return true;
	}

	if (!input.tutorialStep || input.tutorialStep === 'done') {
		return false;
	}

	if (!TUTORIAL_HAND_FILL_STEPS.has(input.tutorialStep)) {
		return false;
	}

	if (!input.pinnedOrderFamily) {
		return false;
	}

	const expectedSlug = handFillResourceSlugForFamily(input.pinnedOrderFamily);
	return expectedSlug !== null && input.sampledResourceSlug === expectedSlug;
}
