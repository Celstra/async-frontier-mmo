import type { ThumperPartSlot } from './thumperPartTypes.js';

export type StarterThumperPartDefinition = {
	schematicId: string;
	displayName: string;
	slot: ThumperPartSlot;
	propertyScores: Record<string, number>;
	condition: number;
	integrity: number;
};

export type SmallPersonalThumperPreset = {
	id: 'old_rundown_small_personal_thumper';
	displayName: string;
	sizeLabel: string;
	baseStats: {
		baseExtractionRate: number;
		secureCargoCapacity: number;
		startingPressure: number;
		startingNoise: number;
		overdriveYieldMultiplier: number;
	};
	supportedComponentSlots: ReadonlyArray<{
		slotId: ThumperPartSlot;
		displayName: string;
		affects: string;
	}>;
	unsupportedComponentSlots: ReadonlyArray<{
		slotId: 'hopper' | 'coolant';
		displayName: string;
		reason: string;
	}>;
	starterParts: ReadonlyArray<StarterThumperPartDefinition>;
};

export const OLD_RUNDOWN_SMALL_PERSONAL_THUMPER: SmallPersonalThumperPreset = {
	id: 'old_rundown_small_personal_thumper',
	displayName: 'Old Small Personal Thumper',
	sizeLabel: 'small personal',
	baseStats: {
		baseExtractionRate: 2.55,
		secureCargoCapacity: 7,
		startingPressure: 18,
		startingNoise: 14,
		overdriveYieldMultiplier: 1.15
	},
	supportedComponentSlots: [
		{
			slotId: 'drill',
			displayName: 'Drill',
			affects: 'bite rate, deposit access, and drill wear'
		},
		{
			slotId: 'pump',
			displayName: 'Pump',
			affects: 'recovery efficiency, pressure stability, and pump wear'
		},
		{
			slotId: 'hull',
			displayName: 'Hull',
			affects: 'secure cargo capacity, damage reduction, and repair budget'
		}
	],
	unsupportedComponentSlots: [
		{
			slotId: 'hopper',
			displayName: 'Hopper',
			reason: 'Small personal frame has no external hopper mount'
		},
		{
			slotId: 'coolant',
			displayName: 'Coolant',
			reason: 'Cooling is built into this worn frame, not a swappable slot'
		}
	],
	starterParts: [
		{
			schematicId: 'worn_basic_drill',
			displayName: 'Worn Basic Drill',
			slot: 'drill',
			propertyScores: { extraction_rate: 35, depth_access: 30, wear_control: 40 },
			condition: 68,
			integrity: 76
		},
		{
			schematicId: 'worn_basic_pump',
			displayName: 'Worn Basic Pump',
			slot: 'pump',
			propertyScores: { recovery_efficiency: 35, clog_resistance: 30, field_stability: 40 },
			condition: 62,
			integrity: 72
		},
		{
			schematicId: 'worn_basic_hull',
			displayName: 'Worn Basic Hull',
			slot: 'hull',
			propertyScores: { max_condition: 40, damage_reduction: 35, repairability: 35 },
			condition: 55,
			integrity: 5
		}
	]
} as const;
