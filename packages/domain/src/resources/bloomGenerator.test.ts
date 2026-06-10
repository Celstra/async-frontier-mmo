import { describe, expect, it } from 'vitest';
import {
	generateBloom,
	LIFESPAN_DAYS_MAX,
	LIFESPAN_DAYS_MIN,
	RESOURCES_PER_FAMILY
} from './bloomGenerator.js';
import { resourceStatsWithinFamilyCaps } from './familyStatCaps.js';
import { RED_MESA_BLOOM_RESOURCES } from './redMesaBloom.js';

describe('generateBloom', () => {
	it('same seed generates the same bloom; different seeds differ', () => {
		const first = generateBloom({ seed: 'rotation-test-alpha' });
		const second = generateBloom({ seed: 'rotation-test-alpha' });
		const third = generateBloom({ seed: 'rotation-test-beta' });

		expect(second).toEqual(first);
		expect(third).not.toEqual(first);
	});

	it('rolls nine resources — three per family', () => {
		const bloom = generateBloom({ seed: 'family-count' });
		expect(bloom.resources).toHaveLength(9);

		for (const family of ['conductive_metal', 'structural_alloy', 'reactive_crystal'] as const) {
			expect(bloom.resources.filter((resource) => resource.family === family)).toHaveLength(
				RESOURCES_PER_FAMILY
			);
		}
	});

	it('every rolled stat is within its family cap', () => {
		const bloom = generateBloom({ seed: 'cap-check' });

		for (const resource of bloom.resources) {
			expect(resourceStatsWithinFamilyCaps(resource.family, resource.stats)).toBe(true);
		}
	});

	it('validates the locked Decision 006 bloom against the caps', () => {
		for (const resource of Object.values(RED_MESA_BLOOM_RESOURCES)) {
			expect(resourceStatsWithinFamilyCaps(resource.family, resource.stats)).toBe(true);
		}
	});

	it('generates unique display names across blooms and reserved names', () => {
		const reserved = new Set(['Veyrith Copper']);
		const first = generateBloom({ seed: 'name-uniqueness-a', reservedDisplayNames: reserved });
		const second = generateBloom({
			seed: 'name-uniqueness-b',
			reservedDisplayNames: new Set([
				...reserved,
				...first.resources.map((resource) => resource.displayName)
			])
		});

		const allNames = [
			...first.resources.map((resource) => resource.displayName),
			...second.resources.map((resource) => resource.displayName)
		];

		expect(new Set(allNames).size).toBe(allNames.length);
		expect(allNames).not.toContain('Veyrith Copper');
	});

	it('stamps concentration_range and lifespan_days within bounds', () => {
		const bloom = generateBloom({ seed: 'lifecycle-fields' });

		for (const resource of bloom.resources) {
			expect(resource.concentrationMinPercent).toBeGreaterThanOrEqual(15);
			expect(resource.concentrationMaxPercent).toBeLessThanOrEqual(95);
			expect(resource.concentrationMaxPercent).toBeGreaterThan(resource.concentrationMinPercent);
			expect(resource.lifespanDays).toBeGreaterThanOrEqual(LIFESPAN_DAYS_MIN);
			expect(resource.lifespanDays).toBeLessThanOrEqual(LIFESPAN_DAYS_MAX);
		}
	});
});
