import type { ResourceStatCode } from 'shared';
import type { CompleteResourceStatMap, ResourceFamily } from './types.js';

/** Prototype caps — BUILD_PLAN Part C addendum (Decision 018). Locked bloom #1 is a valid roll. */
export const FAMILY_STAT_CAPS: Record<
	ResourceFamily,
	Record<ResourceStatCode, { min: number; max: number }>
> = {
	conductive_metal: {
		OQ: { min: 1, max: 1000 },
		conductivity: { min: 300, max: 1000 },
		hardness: { min: 1, max: 600 },
		heat_resistance: { min: 1, max: 800 },
		malleability: { min: 1, max: 800 }
	},
	structural_alloy: {
		OQ: { min: 1, max: 1000 },
		conductivity: { min: 1, max: 400 },
		hardness: { min: 400, max: 1000 },
		heat_resistance: { min: 1, max: 700 },
		malleability: { min: 200, max: 900 }
	},
	reactive_crystal: {
		OQ: { min: 1, max: 1000 },
		conductivity: { min: 200, max: 1000 },
		hardness: { min: 1, max: 600 },
		heat_resistance: { min: 200, max: 1000 },
		malleability: { min: 1, max: 500 }
	}
};

export const MVP_RESOURCE_STAT_CODES = [
	'OQ',
	'conductivity',
	'hardness',
	'heat_resistance',
	'malleability'
] as const satisfies readonly ResourceStatCode[];

export function resourceStatsWithinFamilyCaps(
	family: ResourceFamily,
	stats: CompleteResourceStatMap
): boolean {
	for (const stat of MVP_RESOURCE_STAT_CODES) {
		const cap = FAMILY_STAT_CAPS[family][stat];
		const value = stats[stat];
		if (value < cap.min || value > cap.max) {
			return false;
		}
	}

	return true;
}
