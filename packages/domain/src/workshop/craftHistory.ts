import type { SchematicDefinition } from '../crafting/types.js';

/** Sum of schematic property scores — used to pick the best bench craft for a schematic. */
export function scoreWorkshopCraftItem(
	schematic: SchematicDefinition,
	propertyScores: Record<string, number>
): number {
	return schematic.properties.reduce((sum, property) => sum + (propertyScores[property.id] ?? 0), 0);
}

export function pickBestWorkshopCraftItem<T extends { propertyScores: Record<string, number> }>(
	schematic: SchematicDefinition,
	items: readonly T[]
): T | null {
	if (items.length === 0) {
		return null;
	}

	return items.reduce((best, item) =>
		scoreWorkshopCraftItem(schematic, item.propertyScores) >
		scoreWorkshopCraftItem(schematic, best.propertyScores)
			? item
			: best
	);
}
