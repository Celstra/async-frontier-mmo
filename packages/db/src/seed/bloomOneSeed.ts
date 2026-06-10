/** Locked Red Mesa bloom #1 — nine resources (Decision 006 + 021). */
export const BLOOM_ONE_ID = 1;

export type BloomOneSeedResource = {
	resourceSlug: string;
	displayName: string;
	family: 'conductive_metal' | 'structural_alloy' | 'reactive_crystal';
	stats: {
		OQ: number;
		conductivity: number;
		hardness: number;
		heat_resistance: number;
		malleability: number;
	};
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	/** Rolled once at seed time and frozen (Decision 020). */
	lifespanDays: number;
};

/**
 * Prototype values: Decision 010 stats for the original six, Decision 021 for the
 * three new resources. Concentration ranges from Decision 021-C; lifespans are
 * deterministic seed rolls in the 3–9 day band.
 */
export const BLOOM_ONE_SEED_RESOURCES: readonly BloomOneSeedResource[] = [
	{
		resourceSlug: 'keth_iron',
		displayName: 'Keth Iron',
		family: 'structural_alloy',
		stats: {
			OQ: 520,
			conductivity: 220,
			hardness: 650,
			heat_resistance: 480,
			malleability: 560
		},
		concentrationMinPercent: 55,
		concentrationMaxPercent: 95,
		lifespanDays: 8
	},
	{
		resourceSlug: 'red_mesa_conductive_slag',
		displayName: 'Red Mesa Conductive Slag',
		family: 'conductive_metal',
		stats: {
			OQ: 340,
			conductivity: 610,
			hardness: 310,
			heat_resistance: 720,
			malleability: 390
		},
		concentrationMinPercent: 50,
		concentrationMaxPercent: 90,
		lifespanDays: 7
	},
	{
		resourceSlug: 'asterion_frame_alloy',
		displayName: 'Asterion Frame Alloy',
		family: 'structural_alloy',
		stats: {
			OQ: 690,
			conductivity: 260,
			hardness: 850,
			heat_resistance: 610,
			malleability: 760
		},
		concentrationMinPercent: 25,
		concentrationMaxPercent: 55,
		lifespanDays: 5
	},
	{
		resourceSlug: 'pale_ember_crystal',
		displayName: 'Pale Ember Crystal',
		family: 'reactive_crystal',
		stats: {
			OQ: 680,
			conductivity: 520,
			hardness: 360,
			heat_resistance: 880,
			malleability: 470
		},
		concentrationMinPercent: 30,
		concentrationMaxPercent: 65,
		lifespanDays: 6
	},
	{
		resourceSlug: 'veyrith_copper',
		displayName: 'Veyrith Copper',
		family: 'conductive_metal',
		stats: {
			OQ: 820,
			conductivity: 930,
			hardness: 260,
			heat_resistance: 540,
			malleability: 620
		},
		concentrationMinPercent: 20,
		concentrationMaxPercent: 50,
		lifespanDays: 4
	},
	{
		resourceSlug: 'thornwake_crystal',
		displayName: 'Thornwake Crystal',
		family: 'reactive_crystal',
		stats: {
			OQ: 590,
			conductivity: 910,
			hardness: 420,
			heat_resistance: 210,
			malleability: 160
		},
		concentrationMinPercent: 25,
		concentrationMaxPercent: 55,
		lifespanDays: 5
	},
	{
		resourceSlug: 'sorrel_vein_copper',
		displayName: 'Sorrel Vein Copper',
		family: 'conductive_metal',
		stats: {
			OQ: 560,
			conductivity: 640,
			hardness: 210,
			heat_resistance: 430,
			malleability: 760
		},
		concentrationMinPercent: 40,
		concentrationMaxPercent: 75,
		lifespanDays: 6
	},
	{
		resourceSlug: 'bendrel_ridge_alloy',
		displayName: 'Bendrel Ridge Alloy',
		family: 'structural_alloy',
		stats: {
			OQ: 610,
			conductivity: 150,
			hardness: 430,
			heat_resistance: 330,
			malleability: 880
		},
		concentrationMinPercent: 35,
		concentrationMaxPercent: 70,
		lifespanDays: 7
	},
	{
		resourceSlug: 'glimmerfall_shard',
		displayName: 'Glimmerfall Shard',
		family: 'reactive_crystal',
		stats: {
			OQ: 800,
			conductivity: 680,
			hardness: 300,
			heat_resistance: 640,
			malleability: 210
		},
		concentrationMinPercent: 45,
		concentrationMaxPercent: 80,
		lifespanDays: 9
	}
] as const;
