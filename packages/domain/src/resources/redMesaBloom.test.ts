import type { ResourceStatCode } from 'shared';
import { describe, expect, it } from 'vitest';
import {
	getRedMesaResource,
	listRedMesaResources,
	MVP_RESOURCE_STAT_CODES
} from './redMesaBloom.js';

const MVP_STATS: ResourceStatCode[] = [...MVP_RESOURCE_STAT_CODES];

describe('Red Mesa bloom resources', () => {
	it('defines exactly six Red Mesa bloom resources', () => {
		expect(listRedMesaResources()).toHaveLength(6);
	});

	it('gives every bloom resource all five MVP stats', () => {
		for (const resource of listRedMesaResources()) {
			for (const stat of MVP_STATS) {
				expect(resource.stats[stat], `${resource.id}.${stat}`).toBeTypeOf('number');
				expect(resource.stats[stat], `${resource.id}.${stat}`).toBeGreaterThanOrEqual(1);
				expect(resource.stats[stat], `${resource.id}.${stat}`).toBeLessThanOrEqual(1000);
			}
		}
	});

	it('makes Veyrith Copper high Conductivity and weak Hardness per design intent', () => {
		const veyrith = getRedMesaResource('veyrith_copper');

		expect(veyrith.family).toBe('conductive_metal');
		expect(veyrith.stats.conductivity).toBeGreaterThanOrEqual(900);
		expect(veyrith.stats.hardness).toBeLessThan(500);
		expect(veyrith.stats.conductivity).toBe(930);
		expect(veyrith.stats.hardness).toBe(260);
	});

	it('covers two resources per family', () => {
		const families = listRedMesaResources().map((resource) => resource.family);

		expect(families.filter((family) => family === 'conductive_metal')).toHaveLength(2);
		expect(families.filter((family) => family === 'structural_alloy')).toHaveLength(2);
		expect(families.filter((family) => family === 'reactive_crystal')).toHaveLength(2);
	});
});
