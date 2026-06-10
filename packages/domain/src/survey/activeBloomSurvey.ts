import type { ResourceStatCode } from 'shared';
import { schematicStatWeightsForSlotFamily } from '../crafting/liveSchematicStatWeights.js';
import { MVP_CRAFT_SCHEMATICS } from '../crafting/schematics/index.js';
import { MVP_RESOURCE_STAT_CODES } from '../resources/familyStatCaps.js';
import type { CompleteResourceStatMap, ResourceFamily } from '../resources/types.js';
import { getStatBand } from './statBand.js';
import type { SurveyStatHint } from './types.js';

export type ActiveBloomSurveyResource = {
	resourceSlug: string;
	displayName: string;
	family: ResourceFamily;
	stats: CompleteResourceStatMap;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
};

export type ActiveBloomSurveySignal = {
	resourceSlug: string;
	displayName: string;
	family: ResourceFamily;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	statHints: Array<
		SurveyStatHint & {
			emphasized: boolean;
		}
	>;
};

export type ActiveBloomSurveyResult = {
	regionId: 'red_mesa';
	bloomId: number;
	signals: ActiveBloomSurveySignal[];
	/** Null when no tutorial recommendation applies. */
	recommendedResourceSlug: string | null;
};

function buildStatHints(
	stats: CompleteResourceStatMap,
	family: ResourceFamily,
	surveyClarityScore: number
) {
	const familyWeights = schematicStatWeightsForSlotFamily(MVP_CRAFT_SCHEMATICS, family);
	const hints = MVP_RESOURCE_STAT_CODES.map((stat) => {
		const value = stats[stat];
		const emphasized = familyWeights[stat];
		const hint: ActiveBloomSurveySignal['statHints'][number] = {
			stat,
			band: getStatBand(value),
			emphasized
		};

		if (surveyClarityScore > 0 && emphasized) {
			hint.exactValue = value;
		}

		return hint;
	});

	// Decision 018 §6 — orphan stats sink to the end of the list.
	return [
		...hints.filter((hint) => hint.emphasized),
		...hints.filter((hint) => !hint.emphasized)
	];
}

function buildSignal(
	resource: ActiveBloomSurveyResource,
	surveyClarityScore: number
): ActiveBloomSurveySignal {
	return {
		resourceSlug: resource.resourceSlug,
		displayName: resource.displayName,
		family: resource.family,
		concentrationMinPercent: resource.concentrationMinPercent,
		concentrationMaxPercent: resource.concentrationMaxPercent,
		statHints: buildStatHints(resource.stats, resource.family, surveyClarityScore)
	};
}

export function buildActiveBloomSurvey(input: {
	bloomId: number;
	resources: ActiveBloomSurveyResource[];
	surveyClarityScore?: number;
	recommendedResourceSlug?: string | null;
}): ActiveBloomSurveyResult {
	const surveyClarityScore = input.surveyClarityScore ?? 0;
	const base: ActiveBloomSurveyResult = {
		regionId: 'red_mesa',
		bloomId: input.bloomId,
		signals: input.resources.map((resource) => buildSignal(resource, surveyClarityScore)),
		recommendedResourceSlug: input.recommendedResourceSlug ?? null
	};

	if (surveyClarityScore <= 0) {
		return base;
	}

	return {
		...base,
		signals: base.signals.map((signal) => ({
			...signal,
			statHints: buildStatHints(
				input.resources.find((resource) => resource.resourceSlug === signal.resourceSlug)!.stats,
				signal.family,
				surveyClarityScore
			)
		}))
	};
}

export function isDeemphasizedSurveyStat(
	stat: ResourceStatCode,
	family: ResourceFamily
): boolean {
	return !schematicStatWeightsForSlotFamily(MVP_CRAFT_SCHEMATICS, family)[stat];
}
