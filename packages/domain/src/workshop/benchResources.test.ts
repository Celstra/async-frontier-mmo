import { describe, expect, it } from 'vitest';
import { MVP_RESOURCE_STAT_CODES } from '../resources/familyStatCaps.js';
import {
	WORKSHOP_BENCH_MAX_STAT,
	WORKSHOP_BENCH_RESOURCE_IDS,
	WORKSHOP_STARTER_GRANT_UNITS,
	listWorkshopBenchResources
} from './benchResources.js';

describe('workshop bench resources', () => {
	it('includes all nine existing resource slugs', () => {
		expect(WORKSHOP_BENCH_RESOURCE_IDS).toHaveLength(9);
		expect(new Set(WORKSHOP_BENCH_RESOURCE_IDS).size).toBe(9);
	});

	it('keeps every bench stat at or below the playtest cap (no 800+)', () => {
		for (const resource of listWorkshopBenchResources()) {
			for (const stat of MVP_RESOURCE_STAT_CODES) {
				expect(resource.stats[stat]).toBeLessThanOrEqual(WORKSHOP_BENCH_MAX_STAT);
			}
		}
	});

	it('starter grant gives 180 units of each named bench resource', () => {
		expect(WORKSHOP_STARTER_GRANT_UNITS).toBe(180);
		expect(WORKSHOP_BENCH_RESOURCE_IDS.every((slug) => slug.length > 0)).toBe(true);
	});
});
