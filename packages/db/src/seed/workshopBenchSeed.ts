import { listWorkshopBenchResources } from '@async-frontier-mmo/domain';

/** Isolated bloom for Decision 024 workshop bench stock (not a field bloom). */
export const WORKSHOP_BENCH_BLOOM_ID = 0;

/** Bench instances use a suffix so display names stay unique beside bloom #1. */
export const WORKSHOP_BENCH_DISPLAY_SUFFIX = ' (Bench)';

export function workshopBenchSeedResources() {
	return listWorkshopBenchResources().map((resource) => ({
		resourceSlug: resource.id,
		displayName: `${resource.displayName}${WORKSHOP_BENCH_DISPLAY_SUFFIX}`,
		family: resource.family,
		stats: resource.stats,
		concentrationMinPercent: 50,
		concentrationMaxPercent: 70,
		lifespanDays: 365
	}));
}
