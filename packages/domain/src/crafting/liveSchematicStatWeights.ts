import type { ResourceStatCode } from 'shared';
import { MVP_RESOURCE_STAT_CODES } from '../resources/familyStatCaps.js';
import type { ResourceFamily } from '../resources/types.js';
import type { SchematicDefinition, SchematicWeightTerm } from './types.js';

function termReadsStat(term: SchematicWeightTerm): ResourceStatCode | null {
	if (term.kind === 'slot_stat') {
		return term.stat;
	}
	return null;
}

/** Stats with non-zero weight in at least one live schematic property line (Decision 018 §6). */
export function liveSchematicStatWeights(
	schematics: readonly SchematicDefinition[]
): Record<ResourceStatCode, boolean> {
	const weights = Object.fromEntries(
		MVP_RESOURCE_STAT_CODES.map((stat) => [stat, false])
	) as Record<ResourceStatCode, boolean>;

	for (const schematic of schematics) {
		for (const property of schematic.properties) {
			for (const term of property.terms) {
				const stat = termReadsStat(term);
				if (stat && term.weight > 0) {
					weights[stat] = true;
				}
				if (term.kind === 'average_oq' && term.weight > 0) {
					weights.OQ = true;
				}
			}
		}
	}

	return weights;
}

export function deemphasizedStatsForLiveSchematics(
	schematics: readonly SchematicDefinition[]
): ResourceStatCode[] {
	const weights = liveSchematicStatWeights(schematics);
	return MVP_RESOURCE_STAT_CODES.filter((stat) => !weights[stat]);
}

/** Decision 018 §6 — de-emphasize stats this family never feeds into a live schematic slot. */
export function schematicStatWeightsForSlotFamily(
	schematics: readonly SchematicDefinition[],
	family: ResourceFamily
): Record<ResourceStatCode, boolean> {
	const weights = Object.fromEntries(
		MVP_RESOURCE_STAT_CODES.map((stat) => [stat, false])
	) as Record<ResourceStatCode, boolean>;

	for (const schematic of schematics) {
		const slotFamilyById = Object.fromEntries(
			schematic.slots.map((slot) => [slot.id, slot.requiredFamily])
		);

		for (const property of schematic.properties) {
			for (const term of property.terms) {
				if (term.kind === 'average_oq' && term.weight > 0) {
					weights.OQ = true;
				}
				if (term.kind !== 'slot_stat' || term.weight <= 0) {
					continue;
				}
				if (slotFamilyById[term.slotId] === family) {
					weights[term.stat] = true;
				}
			}
		}
	}

	return weights;
}

export function deemphasizedStatsForSlotFamily(
	schematics: readonly SchematicDefinition[],
	family: ResourceFamily
): ResourceStatCode[] {
	const weights = schematicStatWeightsForSlotFamily(schematics, family);
	return MVP_RESOURCE_STAT_CODES.filter((stat) => !weights[stat]);
}
