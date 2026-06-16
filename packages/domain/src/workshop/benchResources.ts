import type { CompleteResourceStatMap, NamedResourceDefinition, NamedResourceId } from '../resources/types.js';

/** Workshop playtest cap — no 800+ Excellent stats in bench stock (Decision 024). */
export const WORKSHOP_BENCH_MAX_STAT = 799;

export const WORKSHOP_STARTER_GRANT_UNITS = 180;

function stats(values: CompleteResourceStatMap): CompleteResourceStatMap {
	return values;
}

/**
 * Workshop bench stock — same named identities as Red Mesa bloom, reduced stats.
 * Source: WORKSHOP_FIRST_IMPLEMENTATION_PLAN §2.
 */
export const WORKSHOP_BENCH_RESOURCES: Record<NamedResourceId, NamedResourceDefinition> = {
	keth_iron: {
		id: 'keth_iron',
		displayName: 'Keth Iron',
		family: 'structural_alloy',
		stats: stats({
			OQ: 440,
			conductivity: 180,
			hardness: 560,
			heat_resistance: 360,
			malleability: 430
		})
	},
	asterion_frame_alloy: {
		id: 'asterion_frame_alloy',
		displayName: 'Asterion Frame Alloy',
		family: 'structural_alloy',
		stats: stats({
			OQ: 580,
			conductivity: 160,
			hardness: 760,
			heat_resistance: 420,
			malleability: 470
		})
	},
	bendrel_ridge_alloy: {
		id: 'bendrel_ridge_alloy',
		displayName: 'Bendrel Ridge Alloy',
		family: 'structural_alloy',
		stats: stats({
			OQ: 560,
			conductivity: 150,
			hardness: 420,
			heat_resistance: 330,
			malleability: 740
		})
	},
	red_mesa_conductive_slag: {
		id: 'red_mesa_conductive_slag',
		displayName: 'Red Mesa Conductive Slag',
		family: 'conductive_metal',
		stats: stats({
			OQ: 340,
			conductivity: 410,
			hardness: 220,
			heat_resistance: 620,
			malleability: 310
		})
	},
	veyrith_copper: {
		id: 'veyrith_copper',
		displayName: 'Veyrith Copper',
		family: 'conductive_metal',
		stats: stats({
			OQ: 620,
			conductivity: 760,
			hardness: 180,
			heat_resistance: 390,
			malleability: 360
		})
	},
	sorrel_vein_copper: {
		id: 'sorrel_vein_copper',
		displayName: 'Sorrel Vein Copper',
		family: 'conductive_metal',
		stats: stats({
			OQ: 520,
			conductivity: 560,
			hardness: 230,
			heat_resistance: 430,
			malleability: 720
		})
	},
	pale_ember_crystal: {
		id: 'pale_ember_crystal',
		displayName: 'Pale Ember Crystal',
		family: 'reactive_crystal',
		stats: stats({
			OQ: 600,
			conductivity: 360,
			hardness: 220,
			heat_resistance: 760,
			malleability: 300
		})
	},
	thornwake_crystal: {
		id: 'thornwake_crystal',
		displayName: 'Thornwake Crystal',
		family: 'reactive_crystal',
		stats: stats({
			OQ: 500,
			conductivity: 720,
			hardness: 260,
			heat_resistance: 180,
			malleability: 320
		})
	},
	glimmerfall_shard: {
		id: 'glimmerfall_shard',
		displayName: 'Glimmerfall Shard',
		family: 'reactive_crystal',
		stats: stats({
			OQ: 700,
			conductivity: 540,
			hardness: 260,
			heat_resistance: 600,
			malleability: 210
		})
	}
};

export const WORKSHOP_BENCH_RESOURCE_IDS = Object.keys(
	WORKSHOP_BENCH_RESOURCES
) as NamedResourceId[];

export function getWorkshopBenchResource(id: NamedResourceId): NamedResourceDefinition {
	return WORKSHOP_BENCH_RESOURCES[id];
}

export function listWorkshopBenchResources(): NamedResourceDefinition[] {
	return Object.values(WORKSHOP_BENCH_RESOURCES);
}

export function workshopBenchResourcesByFamily(
	family: NamedResourceDefinition['family']
): NamedResourceDefinition[] {
	return listWorkshopBenchResources().filter((resource) => resource.family === family);
}
