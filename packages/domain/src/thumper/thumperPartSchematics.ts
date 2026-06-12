import type { ThumperPartSlot } from './thumperPartTypes.js';

export const THUMPER_PART_SCHEMATIC_IDS = [
	'worn_basic_drill',
	'worn_basic_pump',
	'worn_basic_hull',
	'basic_drill_head',
	'efficient_pump',
	'reinforced_hull_plate'
] as const;

const SCHEMATIC_TO_SLOT: Record<string, ThumperPartSlot> = {
	worn_basic_drill: 'drill',
	basic_drill_head: 'drill',
	worn_basic_pump: 'pump',
	efficient_pump: 'pump',
	worn_basic_hull: 'hull',
	reinforced_hull_plate: 'hull'
};

export function isThumperPartSchematic(
	schematicId: string
): schematicId is (typeof THUMPER_PART_SCHEMATIC_IDS)[number] {
	return (THUMPER_PART_SCHEMATIC_IDS as readonly string[]).includes(schematicId);
}

export function thumperPartSlotForSchematic(schematicId: string): ThumperPartSlot | null {
	return SCHEMATIC_TO_SLOT[schematicId] ?? null;
}
