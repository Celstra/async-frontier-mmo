import { describe, expect, it } from 'vitest';
import { REINFORCED_HULL_PLATE } from './schematics/reinforcedHullPlate.js';
import {
	largestScrapSocket,
	largestSocketScrapUnits,
	describeExperimentPulseOutlook,
	resolveExperimentationPulses,
	schematicMaterialRollup,
	type ExperimentPulse
} from './experimentation.js';
import { previewCraftProperties } from './schematicEngine.js';
import type { CraftPropertyPreview, SchematicSlotFill } from './types.js';

function hullFills(): SchematicSlotFill[] {
	return [
		{
			slotId: 'outer_plate',
			resourceSlug: 'keth_iron',
			resourceDisplayName: 'Keth Iron',
			family: 'structural_alloy',
			stats: {
				OQ: 700,
				hardness: 700,
				malleability: 650,
				conductivity: 400,
				heat_resistance: 500
			}
		},
		{
			slotId: 'bracing_layer',
			resourceSlug: 'keth_iron',
			resourceDisplayName: 'Keth Iron',
			family: 'structural_alloy',
			stats: {
				OQ: 700,
				hardness: 650,
				malleability: 700,
				conductivity: 400,
				heat_resistance: 500
			}
		},
		{
			slotId: 'bonding_matrix',
			resourceSlug: 'pale_ember_crystal',
			resourceDisplayName: 'Pale Ember Crystal',
			family: 'reactive_crystal',
			stats: {
				OQ: 650,
				hardness: 500,
				malleability: 500,
				conductivity: 400,
				heat_resistance: 700
			}
		}
	];
}

describe('experimentation pulses', () => {
	it('rolls up reinforced hull materials for display', () => {
		expect(schematicMaterialRollup(REINFORCED_HULL_PLATE)).toBe(
			'Needs 100 Structural Alloy + 20 Reactive Crystal total'
		);
	});

	it('selects the largest socket for Overdrive scrap', () => {
		expect(largestScrapSocket(REINFORCED_HULL_PLATE)).toEqual({
			slotId: 'outer_plate',
			scrapUnits: 60
		});
	});

	it('success pulse on a capped band never lowers a score above the band midpoint', () => {
		// 'strong' band: 70–84, midpoint = 77.
		// tunedScore = 84 (above midpoint, still in strong).
		// ceilingBand = 'strong' → capIndex clamps to current index → bandAfter stays 'strong'.
		// Bug: scoreForBand('strong') = 77 would drop 84 → 77. Fix: max(84, 77) = 84.
		//
		// Seed 'success-cap-test-0' produces first RNG roll ≈ 0.447 < 0.9 (careful successRate).
		const fakePreview: CraftPropertyPreview = {
			schematicId: REINFORCED_HULL_PLATE.id,
			schematicVersion: REINFORCED_HULL_PLATE.version,
			lines: [
				{
					propertyId: 'max_condition',
					displayName: 'Max Condition',
					baseScore: 84,
					tunedScore: 84,
					resourceCeiling: 84,
					tunedBand: 'strong',
					ceilingBand: 'strong' // cap = current band → success cannot advance the band
				}
			]
		};
		const result = resolveExperimentationPulses({
			preview: fakePreview,
			schematic: REINFORCED_HULL_PLATE,
			slotFills: hullFills(),
			pulses: [
				{ propertyId: 'max_condition', push: 'careful' },
				{ propertyId: 'max_condition', push: 'careful' }
			],
			experimentSeed: 'success-cap-test-0'
		});

		// First pulse must be a success (roll ≈ 0.447 < 0.9)
		expect(result.pulseResults[0]!.outcome).toBe('success');
		// finalScore must not have dropped below the original tunedScore of 84
		const line = result.lines.find((l) => l.propertyId === 'max_condition')!;
		expect(line.finalScore).toBeGreaterThanOrEqual(84);
	});

	it('is deterministic for the same seed and pulses', () => {
		const preview = previewCraftProperties(REINFORCED_HULL_PLATE, hullFills(), {
			max_condition: 2,
			damage_reduction: 1,
			repairability: 0
		});
		const pulses: ExperimentPulse[] = [
			{ propertyId: 'max_condition', push: 'standard' },
			{ propertyId: 'damage_reduction', push: 'overdrive' }
		];

		const first = resolveExperimentationPulses({
			preview,
			schematic: REINFORCED_HULL_PLATE,
			slotFills: hullFills(),
			pulses,
			experimentSeed: 'repeatable-experiment'
		});
		const second = resolveExperimentationPulses({
			preview,
			schematic: REINFORCED_HULL_PLATE,
			slotFills: hullFills(),
			pulses,
			experimentSeed: 'repeatable-experiment'
		});

		expect(second).toEqual(first);
	});

	it('describes pulse outlook bands and odds without rolling RNG', () => {
		const preview = previewCraftProperties(REINFORCED_HULL_PLATE, hullFills(), {
			max_condition: 2,
			damage_reduction: 1,
			repairability: 0
		});
		const line = preview.lines.find((row) => row.propertyId === 'max_condition')!;

		const outlook = describeExperimentPulseOutlook({
			schematic: REINFORCED_HULL_PLATE,
			line,
			push: 'standard'
		});

		expect(outlook.successRatePercent).toBe(65);
		expect(outlook.critRatePercent).toBe(10);
		expect(outlook.wasteRatePercent).toBe(25);
		expect(outlook.success.score).toBeGreaterThanOrEqual(outlook.currentScore);
		expect(outlook.crit).toEqual({
			kind: 'band_loss',
			band: expect.any(String),
			score: expect.any(Number)
		});
	});

	it('describes overdrive crit as largest-socket scrap', () => {
		const preview = previewCraftProperties(REINFORCED_HULL_PLATE, hullFills(), {
			max_condition: 2,
			damage_reduction: 1,
			repairability: 0
		});
		const line = preview.lines.find((row) => row.propertyId === 'damage_reduction')!;

		const outlook = describeExperimentPulseOutlook({
			schematic: REINFORCED_HULL_PLATE,
			line,
			push: 'overdrive'
		});

		expect(outlook.crit).toEqual({ kind: 'scrap', scrapUnits: 60 });
	});
});
