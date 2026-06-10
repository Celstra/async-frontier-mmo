import type { CompleteResourceStatMap, ResourceFamily } from '../resources/types.js';
import type { SchematicDefinition } from './types.js';

export type InventoryStackWithStats = {
	resourceInstanceId: string;
	resourceSlug: string;
	displayName: string;
	family: ResourceFamily;
	quantity: number;
	stats: CompleteResourceStatMap;
};

export type StackAllocationHint = {
	resourceInstanceId: string;
	displayName: string;
	quantity: number;
	family: ResourceFamily;
	stats: CompleteResourceStatMap;
	bestUse: string;
	otherUses: string[];
};

/** Weighted stat contribution when this stack fills a schematic slot (allocation moment). */
export function stackSlotFitScore(
	schematic: SchematicDefinition,
	slotId: string,
	stats: CompleteResourceStatMap
): number {
	let score = 0;

	for (const property of schematic.properties) {
		for (const term of property.terms) {
			if (term.kind === 'slot_stat' && term.slotId === slotId) {
				score += stats[term.stat] * term.weight;
			} else if (term.kind === 'average_oq') {
				score += stats.OQ * term.weight;
			}
		}
	}

	return score;
}

/**
 * Decision 008 allocation moment — where else each named resource is best among live schematics.
 */
export function buildResourceAllocationHints(
	schematics: readonly SchematicDefinition[],
	inventory: InventoryStackWithStats[]
): StackAllocationHint[] {
	return inventory.map((stack) => {
		const ranked: Array<{ label: string; score: number }> = [];

		for (const schematic of schematics) {
			for (const slot of schematic.slots) {
				if (slot.requiredFamily !== stack.family) {
					continue;
				}

				ranked.push({
					label: `${schematic.displayName} · ${slot.displayName}`,
					score: stackSlotFitScore(schematic, slot.id, stack.stats)
				});
			}
		}

		ranked.sort((left, right) => right.score - left.score);
		const [best, ...rest] = ranked;

		return {
			resourceInstanceId: stack.resourceInstanceId,
			displayName: stack.displayName,
			quantity: stack.quantity,
			family: stack.family,
			stats: stack.stats,
			bestUse: best?.label ?? 'No live schematic slot for this family',
			otherUses: rest.slice(0, 3).map((entry) => entry.label)
		};
	});
}
