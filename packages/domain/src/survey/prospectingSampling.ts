import type { ResourceStatCode } from 'shared';
import { applyRoutineUse } from '../durability/itemDurability.js';
import type { ItemDurability } from '../durability/types.js';
import { DEFAULT_PROJECTED_RECOVERY } from '../thumper/generateSeededThumperEventWindows.js';
import { createSeededRng } from '../thumper/seededRng.js';
import type { CompleteResourceStatMap, ResourceFamily } from '../resources/types.js';
import { MVP_RESOURCE_STAT_CODES } from '../resources/familyStatCaps.js';
import type { ActiveBloomSurveyResource } from './activeBloomSurvey.js';
import {
	depositSpotCapacityUnits,
	depositSpotYieldBand,
	depositSpotYieldBandLabel,
	type DepositSpotYieldBand
} from './depositSpotCapacity.js';
import { getStatBand } from './statBand.js';
import type { SurveyStatHint } from './types.js';

/** Regenerating survey-energy cap (Decision 019 — Farm RPG explore pattern). */
export const SURVEY_ENERGY_CAP = 100;
export const FAMILY_SCAN_ENERGY_COST = 8;
export const SAMPLE_ENERGY_COST = 12;
export const SURVEY_ENERGY_REGEN_PER_MINUTE = 2;

export const SCANNER_CONDITION_LOSS_SCAN = 2;
export const SCANNER_CONDITION_LOSS_SAMPLE = 3;

/** Micro-yield per sample — real but not a thumper substitute. */
export const SAMPLE_TRICKLE_UNITS = 2;

export const SPOTS_PER_RESOURCE_MIN = 3;
export const SPOTS_PER_RESOURCE_MAX = 5;

/** Shown on claim when a deposit-spot thump advances the resource prospecting cycle. */
export const PROSPECTING_CYCLE_SCATTER_LINE =
	'The thump scattered nearby signals — survey for fresh deposits.';

/** Cycle 1 keeps legacy ids (`slug:spot:N`); cycle ≥ 2 inserts `:cN:` before the spot index. */
export function formatDepositSpotId(
	resourceSlug: string,
	prospectingCycle: number,
	spotIndex: number
): string {
	if (prospectingCycle <= 1) {
		return `${resourceSlug}:spot:${spotIndex}`;
	}
	return `${resourceSlug}:c${prospectingCycle}:spot:${spotIndex}`;
}

function depositSpotGenerationSeed(input: {
	bloomGenerationSeed: string;
	resourceSlug: string;
	prospectingCycle: number;
}): string {
	if (input.prospectingCycle <= 1) {
		return `spots:${input.bloomGenerationSeed}:${input.resourceSlug}`;
	}
	return `spots:${input.bloomGenerationSeed}:${input.resourceSlug}:c${input.prospectingCycle}`;
}

/** SWG baseline: ~67% concentration ≈ 1.0× extraction rate. */
export const SWG_BASE_CONCENTRATION_PERCENT = 67;

export type DepositSpot = {
	spotId: string;
	resourceSlug: string;
	spotIndex: number;
	trueConcentrationPercent: number;
};

export type DepositSpotYieldPresentation = {
	capacityUnits: number;
	remainingUnits: number;
	yieldBand: DepositSpotYieldBand;
	yieldBandLabel: string;
};

export type PilotSurveyProgress = {
	revealedResourceSlugs: ReadonlySet<string>;
	sampledSpotIds: ReadonlySet<string>;
	surveyEnergy: number;
	lastEnergyUpdatedAtMs: number;
};

export type FamilyScanResourceView = {
	resourceSlug: string;
	displayName: string;
	family: ResourceFamily;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	statsVisible: boolean;
	stats: CompleteResourceStatMap | null;
	statHints: SurveyStatHint[] | null;
	spots: Array<{
		spotId: string;
		spotIndex: number;
		sampled: boolean;
		trueConcentrationPercent: number | null;
		concentrationBandMinPercent: number;
		concentrationBandMaxPercent: number;
		capacityUnits: number;
		remainingUnits: number;
		yieldBand: DepositSpotYieldBand;
		yieldBandLabel: string;
	}>;
};

export type SampleDepositSpotResult = {
	pilotProgress: PilotSurveyProgress;
	trickleGrant: { resourceSlug: string; quantity: number };
	statsRevealedThisSample: boolean;
	revealedStats: CompleteResourceStatMap | null;
	trueConcentrationPercent: number;
	energyCost: number;
	scannerWear: number;
};

export type SampleDepositSpotError =
	| 'insufficient_energy'
	| 'spot_already_sampled'
	| 'spot_resource_mismatch';

function rollInt(rng: () => number, min: number, max: number): number {
	return min + Math.floor(rng() * (max - min + 1));
}

export function createEmptyPilotSurveyProgress(nowMs = 0): PilotSurveyProgress {
	return {
		revealedResourceSlugs: new Set(),
		sampledSpotIds: new Set(),
		surveyEnergy: SURVEY_ENERGY_CAP,
		lastEnergyUpdatedAtMs: nowMs
	};
}

/**
 * Regenerates survey energy up to the cap from elapsed minutes since last update.
 */
export function resolveSurveyEnergy(input: {
	storedEnergy: number;
	lastUpdatedAtMs: number;
	nowMs: number;
	cap?: number;
	regenPerMinute?: number;
}): { energy: number; lastUpdatedAtMs: number } {
	const cap = input.cap ?? SURVEY_ENERGY_CAP;
	const regenPerMinute = input.regenPerMinute ?? SURVEY_ENERGY_REGEN_PER_MINUTE;
	const clampedEnergy = Math.min(cap, input.storedEnergy);
	const elapsedMinutes = Math.floor((input.nowMs - input.lastUpdatedAtMs) / 60_000);

	if (elapsedMinutes <= 0) {
		return { energy: clampedEnergy, lastUpdatedAtMs: input.lastUpdatedAtMs };
	}

	const regened = elapsedMinutes * regenPerMinute;

	return {
		energy: Math.min(cap, clampedEnergy + regened),
		lastUpdatedAtMs: input.lastUpdatedAtMs + elapsedMinutes * 60_000
	};
}

/**
 * Deterministic deposit topology — 3–5 spots per resource, concentrations inside bloom range.
 */
export function generateDepositSpots(input: {
	resourceSlug: string;
	bloomGenerationSeed: string;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	prospectingCycle?: number;
}): DepositSpot[] {
	const prospectingCycle = input.prospectingCycle ?? 1;
	const rng = createSeededRng(
		depositSpotGenerationSeed({
			bloomGenerationSeed: input.bloomGenerationSeed,
			resourceSlug: input.resourceSlug,
			prospectingCycle
		})
	);
	const count = rollInt(rng, SPOTS_PER_RESOURCE_MIN, SPOTS_PER_RESOURCE_MAX);
	const spots: DepositSpot[] = [];

	for (let index = 0; index < count; index += 1) {
		const trueConcentrationPercent = rollInt(
			rng,
			input.concentrationMinPercent,
			input.concentrationMaxPercent
		);

		spots.push({
			spotId: formatDepositSpotId(input.resourceSlug, prospectingCycle, index),
			resourceSlug: input.resourceSlug,
			spotIndex: index,
			trueConcentrationPercent
		});
	}

	return spots;
}

export function findDepositSpot(input: {
	resourceSlug: string;
	bloomGenerationSeed: string;
	concentrationMinPercent: number;
	concentrationMaxPercent: number;
	prospectingCycle: number;
	spotId: string;
}): DepositSpot | undefined {
	const spots = generateDepositSpots(input);
	return spots.find((candidate) => candidate.spotId === input.spotId);
}

/**
 * Display band for an unsampled spot — Survey Clarity tightens the estimate.
 * Sampled spots collapse to the exact true concentration.
 */
export function unsampledSpotConcentrationBand(input: {
	trueConcentrationPercent: number;
	resourceMinPercent: number;
	resourceMaxPercent: number;
	surveyClarityScore: number;
	sampled: boolean;
}): { minPercent: number; maxPercent: number } {
	if (input.sampled) {
		return {
			minPercent: input.trueConcentrationPercent,
			maxPercent: input.trueConcentrationPercent
		};
	}

	const span = input.resourceMaxPercent - input.resourceMinPercent;
	const narrowestHalfWidth = 3;
	const widestHalfWidth = span / 2;
	const clarityFactor = Math.max(0, Math.min(100, input.surveyClarityScore)) / 100;
	const halfWidth = widestHalfWidth - (widestHalfWidth - narrowestHalfWidth) * clarityFactor;

	return {
		minPercent: Math.max(
			input.resourceMinPercent,
			Math.round(input.trueConcentrationPercent - halfWidth)
		),
		maxPercent: Math.min(
			input.resourceMaxPercent,
			Math.round(input.trueConcentrationPercent + halfWidth)
		)
	};
}

/** Maps concentration % to extraction multiplier (~0.5×–1.5×; 67% ≈ 1.0×). */
export function concentrationPercentToExtractionMultiplier(concentrationPercent: number): number {
	const raw = concentrationPercent / SWG_BASE_CONCENTRATION_PERCENT;
	return Math.min(1.5, Math.max(0.5, raw));
}

export function projectedRecoveryWithConcentration(
	baseProjectedRecovery: number,
	concentrationPercent: number
): number {
	const multiplier = concentrationPercentToExtractionMultiplier(concentrationPercent);
	return Math.round(baseProjectedRecovery * multiplier);
}

/** Re-export for tests comparing deploy yield without importing thumper module paths. */
export { DEFAULT_PROJECTED_RECOVERY };

function buildStatHints(stats: CompleteResourceStatMap): SurveyStatHint[] {
	return MVP_RESOURCE_STAT_CODES.map((stat: ResourceStatCode) => ({
		stat,
		band: getStatBand(stats[stat])
	}));
}

/** Per-pilot stat visibility — hidden until first sample on that resource. */
export function presentResourceStatsForPilot(input: {
	resource: ActiveBloomSurveyResource;
	pilotProgress: PilotSurveyProgress;
}): {
	statsVisible: boolean;
	stats: CompleteResourceStatMap | null;
	statHints: SurveyStatHint[] | null;
} {
	const statsVisible = input.pilotProgress.revealedResourceSlugs.has(input.resource.resourceSlug);

	if (!statsVisible) {
		return { statsVisible: false, stats: null, statHints: null };
	}

	return {
		statsVisible: true,
		stats: input.resource.stats,
		statHints: buildStatHints(input.resource.stats)
	};
}

function withResolvedEnergy(
	progress: PilotSurveyProgress,
	nowMs: number
): PilotSurveyProgress {
	const resolved = resolveSurveyEnergy({
		storedEnergy: progress.surveyEnergy,
		lastUpdatedAtMs: progress.lastEnergyUpdatedAtMs,
		nowMs
	});

	return {
		...progress,
		surveyEnergy: resolved.energy,
		lastEnergyUpdatedAtMs: resolved.lastUpdatedAtMs
	};
}

function spendEnergy(progress: PilotSurveyProgress, cost: number): PilotSurveyProgress | null {
	if (progress.surveyEnergy < cost) {
		return null;
	}

	return {
		...progress,
		surveyEnergy: progress.surveyEnergy - cost
	};
}

function resolveYieldPresentation(
	spotId: string,
	bloomGenerationSeed: string,
	yieldBySpotId?: Readonly<Record<string, DepositSpotYieldPresentation>>
): DepositSpotYieldPresentation {
	const stored = yieldBySpotId?.[spotId];
	if (stored) {
		return stored;
	}

	const capacityUnits = depositSpotCapacityUnits({ generationSeed: bloomGenerationSeed, spotId });
	return presentDepositSpotYield({ capacityUnits, extractedUnits: 0 });
}

function presentSpot(
	spot: DepositSpot,
	resource: ActiveBloomSurveyResource,
	pilotProgress: PilotSurveyProgress,
	surveyClarityScore: number,
	bloomGenerationSeed: string,
	yieldBySpotId?: Readonly<Record<string, DepositSpotYieldPresentation>>
): FamilyScanResourceView['spots'][number] {
	const yieldPresentation = resolveYieldPresentation(
		spot.spotId,
		bloomGenerationSeed,
		yieldBySpotId
	);
	const sampled = pilotProgress.sampledSpotIds.has(spot.spotId);
	const band = unsampledSpotConcentrationBand({
		trueConcentrationPercent: spot.trueConcentrationPercent,
		resourceMinPercent: resource.concentrationMinPercent,
		resourceMaxPercent: resource.concentrationMaxPercent,
		surveyClarityScore,
		sampled
	});

	return {
		spotId: spot.spotId,
		spotIndex: spot.spotIndex,
		sampled,
		trueConcentrationPercent: sampled ? spot.trueConcentrationPercent : null,
		concentrationBandMinPercent: band.minPercent,
		concentrationBandMaxPercent: band.maxPercent,
		capacityUnits: yieldPresentation.capacityUnits,
		remainingUnits: yieldPresentation.remainingUnits,
		yieldBand: yieldPresentation.yieldBand,
		yieldBandLabel: yieldPresentation.yieldBandLabel
	};
}

/** Build yield presentation from persisted or default world state. */
export function presentDepositSpotYield(input: {
	capacityUnits: number;
	extractedUnits: number;
}): DepositSpotYieldPresentation {
	const remainingUnits = Math.max(0, input.capacityUnits - input.extractedUnits);
	const yieldBand = depositSpotYieldBand(remainingUnits, input.capacityUnits);

	return {
		capacityUnits: input.capacityUnits,
		remainingUnits,
		yieldBand,
		yieldBandLabel: depositSpotYieldBandLabel(yieldBand)
	};
}

/**
 * Family scan — lists bloom resources in the family with range hints and spot bands.
 * Stats stay hidden until the pilot has sampled that resource at least once.
 */
export function scanFamilyProspect(input: {
	family: ResourceFamily;
	resources: ActiveBloomSurveyResource[];
	spotsByResourceSlug: Readonly<Record<string, readonly DepositSpot[]>>;
	yieldBySpotId?: Readonly<Record<string, DepositSpotYieldPresentation>>;
	pilotProgress: PilotSurveyProgress;
	bloomGenerationSeed: string;
	nowMs: number;
	surveyClarityScore?: number;
}): {
	resources: FamilyScanResourceView[];
	pilotProgress: PilotSurveyProgress;
	energyCost: number;
	scannerWear: number;
} | { error: 'insufficient_energy' } {
	const surveyClarityScore = input.surveyClarityScore ?? 0;
	let progress = withResolvedEnergy(input.pilotProgress, input.nowMs);
	const afterSpend = spendEnergy(progress, FAMILY_SCAN_ENERGY_COST);

	if (!afterSpend) {
		return { error: 'insufficient_energy' };
	}

	progress = afterSpend;

	const resources = buildFamilyResourceViews({
		family: input.family,
		resources: input.resources,
		spotsByResourceSlug: input.spotsByResourceSlug,
		yieldBySpotId: input.yieldBySpotId,
		pilotProgress: progress,
		bloomGenerationSeed: input.bloomGenerationSeed,
		surveyClarityScore
	});

	return {
		resources,
		pilotProgress: progress,
		energyCost: FAMILY_SCAN_ENERGY_COST,
		scannerWear: SCANNER_CONDITION_LOSS_SCAN
	};
}

function buildFamilyResourceViews(input: {
	family: ResourceFamily;
	resources: ActiveBloomSurveyResource[];
	spotsByResourceSlug: Readonly<Record<string, readonly DepositSpot[]>>;
	yieldBySpotId?: Readonly<Record<string, DepositSpotYieldPresentation>>;
	pilotProgress: PilotSurveyProgress;
	bloomGenerationSeed: string;
	surveyClarityScore: number;
}): FamilyScanResourceView[] {
	const familyResources = input.resources.filter((resource) => resource.family === input.family);

	return familyResources.map((resource) => {
		const spots =
			input.spotsByResourceSlug[resource.resourceSlug] ??
			generateDepositSpots({
				resourceSlug: resource.resourceSlug,
				bloomGenerationSeed: input.bloomGenerationSeed,
				concentrationMinPercent: resource.concentrationMinPercent,
				concentrationMaxPercent: resource.concentrationMaxPercent
			});

		const statsPresentation = presentResourceStatsForPilot({
			resource,
			pilotProgress: input.pilotProgress
		});

		return {
			resourceSlug: resource.resourceSlug,
			displayName: resource.displayName,
			family: resource.family,
			concentrationMinPercent: resource.concentrationMinPercent,
			concentrationMaxPercent: resource.concentrationMaxPercent,
			statsVisible: statsPresentation.statsVisible,
			stats: statsPresentation.stats,
			statHints: statsPresentation.statHints,
			spots: spots.map((spot) =>
				presentSpot(
					spot,
					resource,
					input.pilotProgress,
					input.surveyClarityScore,
					input.bloomGenerationSeed,
					input.yieldBySpotId
				)
			)
		};
	});
}

/** Read-only family scan presentation — no energy spend (page load / post-action refresh). */
export function buildFamilyScanPreview(input: {
	family: ResourceFamily;
	resources: ActiveBloomSurveyResource[];
	spotsByResourceSlug: Readonly<Record<string, readonly DepositSpot[]>>;
	yieldBySpotId?: Readonly<Record<string, DepositSpotYieldPresentation>>;
	pilotProgress: PilotSurveyProgress;
	bloomGenerationSeed: string;
	surveyClarityScore?: number;
}): FamilyScanResourceView[] {
	return buildFamilyResourceViews({
		...input,
		surveyClarityScore: input.surveyClarityScore ?? 0
	});
}

/**
 * Sample a deposit spot — reveals true concentration, grants one trickle, and on
 * the resource's first sample reveals all five stats for this pilot.
 */
export function sampleDepositSpot(input: {
	resource: ActiveBloomSurveyResource;
	spot: DepositSpot;
	pilotProgress: PilotSurveyProgress;
	nowMs: number;
}): SampleDepositSpotResult | { error: SampleDepositSpotError } {
	if (input.spot.resourceSlug !== input.resource.resourceSlug) {
		return { error: 'spot_resource_mismatch' };
	}

	let progress = withResolvedEnergy(input.pilotProgress, input.nowMs);

	if (progress.sampledSpotIds.has(input.spot.spotId)) {
		return { error: 'spot_already_sampled' };
	}

	const afterSpend = spendEnergy(progress, SAMPLE_ENERGY_COST);
	if (!afterSpend) {
		return { error: 'insufficient_energy' };
	}

	progress = afterSpend;

	const statsRevealedThisSample = !progress.revealedResourceSlugs.has(input.resource.resourceSlug);
	const revealedResourceSlugs = new Set(progress.revealedResourceSlugs);
	revealedResourceSlugs.add(input.resource.resourceSlug);

	const sampledSpotIds = new Set(progress.sampledSpotIds);
	sampledSpotIds.add(input.spot.spotId);

	return {
		pilotProgress: {
			...progress,
			revealedResourceSlugs,
			sampledSpotIds
		},
		trickleGrant: {
			resourceSlug: input.resource.resourceSlug,
			quantity: SAMPLE_TRICKLE_UNITS
		},
		statsRevealedThisSample,
		revealedStats: statsRevealedThisSample ? input.resource.stats : null,
		trueConcentrationPercent: input.spot.trueConcentrationPercent,
		energyCost: SAMPLE_ENERGY_COST,
		scannerWear: SCANNER_CONDITION_LOSS_SAMPLE
	};
}

/** Applies scanner wear from a prospecting action. */
export function applyProspectingScannerWear(
	scanner: ItemDurability,
	conditionLoss: number
): ItemDurability {
	return applyRoutineUse(scanner, conditionLoss);
}
