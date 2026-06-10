import type { ThumperPartSlot } from './thumperPartTypes.js';

/** Decision 011 starter thumper parts — fixed low scores, reduced Condition. */
export type StarterWornPartDefinition = {
	schematicId: string;
	displayName: string;
	slot: ThumperPartSlot;
	propertyScores: Record<string, number>;
	condition: number;
	integrity: number;
};

export const WORN_BASIC_DRILL: StarterWornPartDefinition = {
	schematicId: 'worn_basic_drill',
	displayName: 'Worn Basic Drill',
	slot: 'drill',
	propertyScores: {
		extraction_rate: 35,
		depth_access: 30,
		wear_control: 40
	},
	condition: 55,
	integrity: 70
};

export const WORN_BASIC_PUMP: StarterWornPartDefinition = {
	schematicId: 'worn_basic_pump',
	displayName: 'Worn Basic Pump',
	slot: 'pump',
	propertyScores: {
		recovery_efficiency: 35,
		clog_resistance: 30,
		field_stability: 35
	},
	condition: 55,
	integrity: 70
};

export const WORN_BASIC_HULL: StarterWornPartDefinition = {
	schematicId: 'worn_basic_hull',
	displayName: 'Worn Basic Hull',
	slot: 'hull',
	propertyScores: {
		max_condition: 40,
		damage_reduction: 35,
		repairability: 35
	},
	condition: 55,
	integrity: 70
};

export const STARTER_WORN_THUMPER_PARTS = [
	WORN_BASIC_DRILL,
	WORN_BASIC_PUMP,
	WORN_BASIC_HULL
] as const;

export const THUMPER_PART_SCHEMATIC_IDS = new Set([
	WORN_BASIC_DRILL.schematicId,
	WORN_BASIC_PUMP.schematicId,
	WORN_BASIC_HULL.schematicId,
	'basic_drill_head',
	'efficient_pump',
	'reinforced_hull_plate'
]);

const SCHEMATIC_SLOT: Record<string, ThumperPartSlot> = {
	worn_basic_drill: 'drill',
	basic_drill_head: 'drill',
	worn_basic_pump: 'pump',
	efficient_pump: 'pump',
	worn_basic_hull: 'hull',
	reinforced_hull_plate: 'hull'
};

export function thumperPartSlotForSchematic(schematicId: string): ThumperPartSlot | null {
	return SCHEMATIC_SLOT[schematicId] ?? null;
}

export function isThumperPartSchematic(schematicId: string): boolean {
	return THUMPER_PART_SCHEMATIC_IDS.has(schematicId);
}
