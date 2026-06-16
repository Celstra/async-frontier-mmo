import { createSeededRng } from '../rng.js';
import type { CompleteResourceStatMap, NamedResourceId, ResourceFamily } from '../resources/types.js';
import { WORKSHOP_BENCH_MAX_STAT, getWorkshopBenchResource, workshopBenchResourcesByFamily } from './benchResources.js';
import {
	WORKSHOP_CRATE_UNITS_PER_FAMILY,
	WORKSHOP_EMERGENCY_CRATE_UNITS_PER_FAMILY
} from './constants.js';

export type WorkshopSupplyCrateReason = 'timer' | 'craft_count' | 'emergency' | 'starter';

export type WorkshopCrateGrantMode = 'fixed' | 'varied';

export type WorkshopCrateGrantLine = {
	resourceSlug: NamedResourceId;
	family: ResourceFamily;
	quantity: number;
	stats: CompleteResourceStatMap;
};

/** Default Phase 2 fixed crate stacks — one low/mid bench identity per family. */
export const WORKSHOP_FIXED_CRATE_RESOURCE_BY_FAMILY: Record<ResourceFamily, NamedResourceId> = {
	structural_alloy: 'keth_iron',
	conductive_metal: 'red_mesa_conductive_slag',
	reactive_crystal: 'pale_ember_crystal'
};

const WORKSHOP_RESOURCE_FAMILIES: ResourceFamily[] = [
	'structural_alloy',
	'conductive_metal',
	'reactive_crystal'
];

export function pickVariedBenchCrateResources(input: {
	pilotId: string;
	crateSequence: number;
}): Record<ResourceFamily, NamedResourceId> {
	const rng = createSeededRng(`${input.pilotId}:workshop-crate:${input.crateSequence}`);
	const picks = {} as Record<ResourceFamily, NamedResourceId>;

	for (const family of WORKSHOP_RESOURCE_FAMILIES) {
		const candidates = workshopBenchResourcesByFamily(family).map((resource) => resource.id);
		const index = Math.floor(rng() * candidates.length);
		picks[family] = candidates[index]!;
	}

	return picks;
}

export function buildSupplyCratePayload(input: {
	mode: WorkshopCrateGrantMode;
	unitsPerFamily?: number;
	variedPicks?: Record<ResourceFamily, NamedResourceId>;
}): WorkshopCrateGrantLine[] {
	const unitsPerFamily = input.unitsPerFamily ?? WORKSHOP_CRATE_UNITS_PER_FAMILY;
	const resourceByFamily =
		input.mode === 'fixed'
			? WORKSHOP_FIXED_CRATE_RESOURCE_BY_FAMILY
			: input.variedPicks;

	if (!resourceByFamily) {
		throw new Error('Varied crate payload requires variedPicks');
	}

	return WORKSHOP_RESOURCE_FAMILIES.map((family) => {
		const resourceSlug = resourceByFamily[family];
		const definition = getWorkshopBenchResource(resourceSlug);
		if (definition.family !== family) {
			throw new Error(`Crate resource ${resourceSlug} is not in family ${family}`);
		}
		return {
			resourceSlug,
			family,
			quantity: unitsPerFamily,
			stats: definition.stats
		};
	});
}

export function buildEmergencySupplyCratePayload(
	mode: WorkshopCrateGrantMode = 'fixed',
	variedPicks?: Record<ResourceFamily, NamedResourceId>
): WorkshopCrateGrantLine[] {
	return buildSupplyCratePayload({
		mode,
		unitsPerFamily: WORKSHOP_EMERGENCY_CRATE_UNITS_PER_FAMILY,
		variedPicks
	});
}

export function cratePayloadUsesOnlyLowMidBenchStats(payload: readonly WorkshopCrateGrantLine[]): boolean {
	return payload.every((line) =>
		Object.values(line.stats).every((value) => value <= WORKSHOP_BENCH_MAX_STAT)
	);
}

export function cratePayloadCoversAllFamilies(payload: readonly WorkshopCrateGrantLine[]): boolean {
	const families = new Set(payload.map((line) => line.family));
	return WORKSHOP_RESOURCE_FAMILIES.every((family) => families.has(family));
}
