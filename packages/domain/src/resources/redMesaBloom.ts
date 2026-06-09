import type { ResourceStatCode } from 'shared';
import type { CompleteResourceStatMap, NamedResourceDefinition, NamedResourceId } from './types.js';

/** Locked MVP stat codes for documentation tests and downstream consumers. */
export const MVP_RESOURCE_STAT_CODES = [
	'OQ',
	'conductivity',
	'hardness',
	'heat_resistance',
	'malleability'
] as const satisfies readonly ResourceStatCode[];

function stats(values: CompleteResourceStatMap): CompleteResourceStatMap {
	return values;
}

/** First Red Mesa Bloom — Decision 006 roster, Decision 010 prototype values. */
export const RED_MESA_BLOOM_RESOURCES: Record<NamedResourceId, NamedResourceDefinition> = {
	keth_iron: {
		id: 'keth_iron',
		displayName: 'Keth Iron',
		family: 'structural_alloy',
		stats: stats({
			OQ: 520,
			conductivity: 220,
			hardness: 650,
			heat_resistance: 480,
			malleability: 560
		})
	},
	red_mesa_conductive_slag: {
		id: 'red_mesa_conductive_slag',
		displayName: 'Red Mesa Conductive Slag',
		family: 'conductive_metal',
		stats: stats({
			OQ: 340,
			conductivity: 610,
			hardness: 310,
			heat_resistance: 720,
			malleability: 390
		})
	},
	asterion_frame_alloy: {
		id: 'asterion_frame_alloy',
		displayName: 'Asterion Frame Alloy',
		family: 'structural_alloy',
		stats: stats({
			OQ: 690,
			conductivity: 260,
			hardness: 850,
			heat_resistance: 610,
			malleability: 760
		})
	},
	pale_ember_crystal: {
		id: 'pale_ember_crystal',
		displayName: 'Pale Ember Crystal',
		family: 'reactive_crystal',
		stats: stats({
			OQ: 680,
			conductivity: 520,
			hardness: 360,
			heat_resistance: 880,
			malleability: 470
		})
	},
	veyrith_copper: {
		id: 'veyrith_copper',
		displayName: 'Veyrith Copper',
		family: 'conductive_metal',
		stats: stats({
			OQ: 820,
			conductivity: 930,
			hardness: 260,
			heat_resistance: 540,
			malleability: 620
		})
	},
	thornwake_crystal: {
		id: 'thornwake_crystal',
		displayName: 'Thornwake Crystal',
		family: 'reactive_crystal',
		stats: stats({
			OQ: 590,
			conductivity: 910,
			hardness: 420,
			heat_resistance: 210,
			malleability: 160
		})
	}
};

export function getRedMesaResource(id: NamedResourceId): NamedResourceDefinition {
	return RED_MESA_BLOOM_RESOURCES[id];
}

export function listRedMesaResources(): NamedResourceDefinition[] {
	return Object.values(RED_MESA_BLOOM_RESOURCES);
}
