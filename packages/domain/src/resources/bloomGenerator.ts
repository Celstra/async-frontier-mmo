import type { ResourceStatCode } from 'shared';
import { createSeededRng } from '../thumper/seededRng.js';
import { FAMILY_STAT_CAPS, MVP_RESOURCE_STAT_CODES } from './familyStatCaps.js';
import type { CompleteResourceStatMap, ResourceFamily } from './types.js';

export const RESOURCES_PER_FAMILY = 3;
export const LIFESPAN_DAYS_MIN = 3;
export const LIFESPAN_DAYS_MAX = 9;

const BLOOM_FAMILIES: ResourceFamily[] = [
	'conductive_metal',
	'structural_alloy',
	'reactive_crystal'
];

const NAME_PREFIXES = [
	'Ash',
	'Bendrel',
	'Cinder',
	'Dusk',
	'Ember',
	'Glimmer',
	'Iron',
	'Keth',
	'Mesa',
	'Pale',
	'Red',
	'Sorrel',
	'Thorn',
	'Vein',
	'Veyrith'
] as const;

const NAME_SUFFIXES = [
	'Alloy',
	'Copper',
	'Crystal',
	'Frame',
	'Hollow',
	'Iron',
	'Ridge',
	'Shard',
	'Slag',
	'Spire',
	'Vein',
	'Wake'
] as const;

export type GeneratedBloomResource = {
	resourceSlug: string;
	displayName: string;
	family: ResourceFamily;
	stats: CompleteResourceStatMap;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	lifespanDays: number;
};

export type GeneratedBloom = {
	generationSeed: string;
	resources: GeneratedBloomResource[];
};

function rollInt(rng: () => number, min: number, max: number): number {
	if (max < min) {
		throw new Error(`Invalid roll range ${min}..${max}`);
	}
	return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: () => number, values: readonly T[]): T {
	return values[rollInt(rng, 0, values.length - 1)]!;
}

function rollStatsForFamily(
	rng: () => number,
	family: ResourceFamily
): CompleteResourceStatMap {
	const caps = FAMILY_STAT_CAPS[family];
	const stats = {} as CompleteResourceStatMap;

	for (const stat of MVP_RESOURCE_STAT_CODES) {
		const cap = caps[stat];
		stats[stat] = rollInt(rng, cap.min, cap.max);
	}

	return stats;
}

function rollConcentrationRange(rng: () => number): {
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
} {
	const concentrationMinPercent = rollInt(rng, 15, 55);
	const span = rollInt(rng, 15, 45);
	const concentrationMaxPercent = Math.min(95, concentrationMinPercent + span);

	return { concentrationMinPercent, concentrationMaxPercent };
}

function slugForGeneratedResource(
	seed: string,
	family: ResourceFamily,
	index: number,
	displayName: string
): string {
	const familyCode =
		family === 'conductive_metal' ? 'cm' : family === 'structural_alloy' ? 'sa' : 'rc';
	const normalized = displayName
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '_')
		.replace(/^_|_$/g, '');
	const hash = createSeededRng(`${seed}:${family}:${index}:${displayName}`)()
		.toString(36)
		.slice(2, 8);

	return `${familyCode}_${normalized}_${hash}`;
}

function generateUniqueDisplayName(
	rng: () => number,
	reservedDisplayNames: ReadonlySet<string>
): string {
	for (let attempt = 0; attempt < 64; attempt += 1) {
		const candidate = `${pick(rng, NAME_PREFIXES)} ${pick(rng, NAME_SUFFIXES)}`;
		if (!reservedDisplayNames.has(candidate)) {
			return candidate;
		}
	}

	const fallback = `Frontier Resource ${rollInt(rng, 1000, 9999)}`;
	if (reservedDisplayNames.has(fallback)) {
		return `${fallback} ${rollInt(rng, 100, 999)}`;
	}

	return fallback;
}

/**
 * Pure bloom generator (Decision 018 + 021 + 020).
 * Uniform rolls within family caps — distribution shape is a tuning knob.
 */
export function generateBloom(input: {
	seed: string;
	reservedDisplayNames?: ReadonlySet<string>;
}): GeneratedBloom {
	const rng = createSeededRng(input.seed);
	const reserved = new Set(input.reservedDisplayNames ?? []);
	const resources: GeneratedBloomResource[] = [];

	for (const family of BLOOM_FAMILIES) {
		for (let index = 0; index < RESOURCES_PER_FAMILY; index += 1) {
			const displayName = generateUniqueDisplayName(rng, reserved);
			reserved.add(displayName);

			const stats = rollStatsForFamily(rng, family);
			const concentration = rollConcentrationRange(rng);
			const lifespanDays = rollInt(rng, LIFESPAN_DAYS_MIN, LIFESPAN_DAYS_MAX);

			resources.push({
				resourceSlug: slugForGeneratedResource(input.seed, family, index, displayName),
				displayName,
				family,
				stats,
				...concentration,
				lifespanDays
			});
		}
	}

	return {
		generationSeed: input.seed,
		resources
	};
}
