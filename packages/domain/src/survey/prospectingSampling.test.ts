import { describe, expect, it } from 'vitest';
import type { ActiveBloomSurveyResource } from './activeBloomSurvey.js';
import {
	createEmptyPilotSurveyProgress,
	DEFAULT_PROJECTED_RECOVERY,
	formatDepositSpotId,
	generateDepositSpots,
	presentResourceStatsForPilot,
	projectedRecoveryWithConcentration,
	resolveSurveyEnergy,
	SAMPLE_ENERGY_COST,
	SAMPLE_TRICKLE_UNITS,
	SURVEY_ENERGY_CAP,
	sampleDepositSpot,
	unsampledSpotConcentrationBand
} from './prospectingSampling.js';

const testResource: ActiveBloomSurveyResource = {
	resourceSlug: 'cm_test_copper_abc123',
	displayName: 'Test Copper',
	family: 'conductive_metal',
	stats: {
		OQ: 720,
		conductivity: 880,
		hardness: 210,
		heat_resistance: 340,
		malleability: 510
	},
	concentrationMinPercent: 30,
	concentrationMaxPercent: 67
};

const bloomSeed = 'lesson-22b-test-seed';

function spotsForResource(resource: ActiveBloomSurveyResource = testResource) {
	return generateDepositSpots({
		resourceSlug: resource.resourceSlug,
		bloomGenerationSeed: bloomSeed,
		concentrationMinPercent: resource.concentrationMinPercent,
		concentrationMaxPercent: resource.concentrationMaxPercent
	});
}

describe('prospectingSampling', () => {
	it('hides resource stats until the pilot samples that resource once', () => {
		const spots = spotsForResource();
		const progress = createEmptyPilotSurveyProgress();

		const before = presentResourceStatsForPilot({ resource: testResource, pilotProgress: progress });
		expect(before.statsVisible).toBe(false);
		expect(before.stats).toBeNull();
		expect(before.statHints).toBeNull();

		const sampleResult = sampleDepositSpot({
			resource: testResource,
			spot: spots[0]!,
			pilotProgress: progress,
			nowMs: 0
		});

		expect('error' in sampleResult).toBe(false);
		if ('error' in sampleResult) {
			return;
		}

		expect(sampleResult.statsRevealedThisSample).toBe(true);
		expect(sampleResult.revealedStats).toEqual(testResource.stats);

		const after = presentResourceStatsForPilot({
			resource: testResource,
			pilotProgress: sampleResult.pilotProgress
		});
		expect(after.statsVisible).toBe(true);
		expect(after.stats).toEqual(testResource.stats);
		expect(after.statHints).toHaveLength(5);
	});

	it('spends survey energy and grants exactly one trickle grant per sample action', () => {
		const spots = spotsForResource();
		const startEnergy = 50;
		const progress = {
			...createEmptyPilotSurveyProgress(),
			surveyEnergy: startEnergy
		};

		const result = sampleDepositSpot({
			resource: testResource,
			spot: spots[0]!,
			pilotProgress: progress,
			nowMs: 0
		});

		expect('error' in result).toBe(false);
		if ('error' in result) {
			return;
		}

		expect(result.energyCost).toBe(SAMPLE_ENERGY_COST);
		expect(result.pilotProgress.surveyEnergy).toBe(startEnergy - SAMPLE_ENERGY_COST);
		expect(result.trickleGrant).toEqual({
			resourceSlug: testResource.resourceSlug,
			quantity: SAMPLE_TRICKLE_UNITS
		});
	});

	it('narrows unsampled spot concentration bands as Survey Clarity improves', () => {
		const spot = {
			trueConcentrationPercent: 55,
			resourceMinPercent: 30,
			resourceMaxPercent: 67,
			sampled: false
		};

		const lowClarity = unsampledSpotConcentrationBand({
			...spot,
			surveyClarityScore: 20
		});
		const highClarity = unsampledSpotConcentrationBand({
			...spot,
			surveyClarityScore: 85
		});

		const lowWidth = lowClarity.maxPercent - lowClarity.minPercent;
		const highWidth = highClarity.maxPercent - highClarity.minPercent;

		expect(highWidth).toBeLessThan(lowWidth);
		expect(highClarity.minPercent).toBeLessThanOrEqual(spot.trueConcentrationPercent);
		expect(highClarity.maxPercent).toBeGreaterThanOrEqual(spot.trueConcentrationPercent);
	});

	it('rejects sampling when the spot belongs to a different resource', () => {
		const otherResource: ActiveBloomSurveyResource = {
			...testResource,
			resourceSlug: 'cm_other_slag_def456',
			displayName: 'Other Slag'
		};
		const foreignSpot = spotsForResource(otherResource)[0]!;

		const result = sampleDepositSpot({
			resource: testResource,
			spot: foreignSpot,
			pilotProgress: createEmptyPilotSurveyProgress(),
			nowMs: 0
		});

		expect(result).toEqual({ error: 'spot_resource_mismatch' });
	});

	it('clamps over-cap survey energy even when no full minute has elapsed', () => {
		const resolved = resolveSurveyEnergy({
			storedEnergy: SURVEY_ENERGY_CAP + 25,
			lastUpdatedAtMs: 1_000,
			nowMs: 30_000
		});

		expect(resolved.energy).toBe(SURVEY_ENERGY_CAP);
		expect(resolved.lastUpdatedAtMs).toBe(1_000);
	});

	it('deploying on a ~1.4× spot out-yields the same run on a ~0.6× spot', () => {
		const base = DEFAULT_PROJECTED_RECOVERY;
		const poorSpotRecovery = projectedRecoveryWithConcentration(base, 40);
		const richSpotRecovery = projectedRecoveryWithConcentration(base, 94);

		expect(richSpotRecovery).toBeGreaterThan(poorSpotRecovery);
		expect(poorSpotRecovery).toBeLessThan(base);
		expect(richSpotRecovery).toBeGreaterThan(base);
	});

	it('keeps cycle 1 spot ids in the legacy format for backward compatibility', () => {
		const spots = spotsForResource();
		expect(spots[0]?.spotId).toBe(formatDepositSpotId(testResource.resourceSlug, 1, 0));
		expect(spots[0]?.spotId).toBe(`${testResource.resourceSlug}:spot:0`);
		expect(spots[0]?.spotId).not.toMatch(/:c\d+:spot:/);
	});

	it('produces deterministic spots per cycle and changes ids and concentrations across cycles', () => {
		const cycleOneA = generateDepositSpots({
			resourceSlug: testResource.resourceSlug,
			bloomGenerationSeed: bloomSeed,
			concentrationMinPercent: testResource.concentrationMinPercent,
			concentrationMaxPercent: testResource.concentrationMaxPercent,
			prospectingCycle: 1
		});
		const cycleOneB = generateDepositSpots({
			resourceSlug: testResource.resourceSlug,
			bloomGenerationSeed: bloomSeed,
			concentrationMinPercent: testResource.concentrationMinPercent,
			concentrationMaxPercent: testResource.concentrationMaxPercent,
			prospectingCycle: 1
		});
		const cycleTwo = generateDepositSpots({
			resourceSlug: testResource.resourceSlug,
			bloomGenerationSeed: bloomSeed,
			concentrationMinPercent: testResource.concentrationMinPercent,
			concentrationMaxPercent: testResource.concentrationMaxPercent,
			prospectingCycle: 2
		});

		expect(cycleOneA).toEqual(cycleOneB);
		expect(cycleTwo[0]?.spotId).toBe(`${testResource.resourceSlug}:c2:spot:0`);
		expect(cycleTwo.map((spot) => spot.spotId)).not.toEqual(cycleOneA.map((spot) => spot.spotId));

		const sharedIndex = Math.min(cycleOneA.length, cycleTwo.length) - 1;
		if (sharedIndex >= 0) {
			expect(cycleTwo[sharedIndex]?.trueConcentrationPercent).not.toBe(
				cycleOneA[sharedIndex]?.trueConcentrationPercent
			);
		}
	});
});
