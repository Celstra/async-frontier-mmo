import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../resources/redMesaBloom.js';
import { resolveCraft } from '../crafting/schematicEngine.js';
import type { SchematicSlotFill } from '../crafting/types.js';
import { EFFICIENT_PUMP } from '../crafting/schematics/efficientPump.js';
import { generateSeededThumperEventWindows } from './generateSeededThumperEventWindows.js';
import { resolveThumperRunResult } from './resolveThumperRunResult.js';
import { WORN_BASIC_PUMP } from './starterWornParts.js';
import { MATCHING_ACTION_WEAR_CONDITION } from './eventWindowSeverity.js';
import {
	applyWearToRunParts,
	computeRunPartWearDeltas,
	computeThumperPartRunModifiers,
	partConditionPerformanceMultiplier
} from './thumperPartModifiers.js';
import type { ThumperPartSnapshot } from './thumperPartTypes.js';

function slotFill(slotId: string, resourceId: string): SchematicSlotFill {
	const resource = getRedMesaResource(resourceId as 'veyrith_copper');
	return {
		slotId,
		resourceSlug: resource.id,
		resourceDisplayName: resource.displayName,
		family: resource.family,
		stats: { ...resource.stats }
	};
}

function craftedEfficientPumpSnapshot(): ThumperPartSnapshot {
	const fills = [
		slotFill('intake_manifold', 'sorrel_vein_copper'),
		slotFill('flexible_housing', 'bendrel_ridge_alloy'),
		slotFill('flow_crystal', 'glimmerfall_shard')
	];
	const resolution = resolveCraft({
		schematic: EFFICIENT_PUMP,
		slotFills: fills,
		tuning: { recovery_efficiency: 2, clog_resistance: 1, field_stability: 0 },
		mode: 'safe_craft'
	});
	const scores = Object.fromEntries(resolution.lines.map((line) => [line.propertyId, line.finalScore]));

	return {
		slot: 'pump',
		itemId: 'crafted-pump',
		schematicId: EFFICIENT_PUMP.id,
		displayName: EFFICIENT_PUMP.displayName,
		propertyScores: scores,
		condition: 100,
		integrity: 100
	};
}

function wornPumpSnapshot(): ThumperPartSnapshot {
	return {
		slot: 'pump',
		itemId: 'worn-pump',
		schematicId: WORN_BASIC_PUMP.schematicId,
		displayName: WORN_BASIC_PUMP.displayName,
		propertyScores: { ...WORN_BASIC_PUMP.propertyScores },
		condition: WORN_BASIC_PUMP.condition,
		integrity: WORN_BASIC_PUMP.integrity
	};
}

function neutralDrillHull(): ThumperPartSnapshot[] {
	return [
		{
			slot: 'drill',
			itemId: 'drill-1',
			schematicId: 'worn_basic_drill',
			displayName: 'Worn Basic Drill',
			propertyScores: { extraction_rate: 35, depth_access: 30, wear_control: 40 },
			condition: 55,
			integrity: 70
		},
		{
			slot: 'hull',
			itemId: 'hull-1',
			schematicId: 'worn_basic_hull',
			displayName: 'Worn Basic Hull',
			propertyScores: { max_condition: 40, damage_reduction: 35, repairability: 35 },
			condition: 55,
			integrity: 70
		}
	];
}

describe('thumper part modifiers', () => {
	it('crafted Efficient Pump yields more claimed quantity than Worn Basic Pump on the same seed', () => {
		const runSeed = 'lesson-21-pump-compare';
		const plan = generateSeededThumperEventWindows({
			runSeed,
			targetResourceId: 'veyrith_copper',
			isPushRun: false
		});
		const responses = plan.windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication,
			chosenResponse: window.matchingAction
		}));

		const wornResult = resolveThumperRunResult({
			runConfig: {
				targetResourceId: 'veyrith_copper',
				projectedRecovery: plan.projectedRecovery,
				runSeed,
				partModifiers: computeThumperPartRunModifiers([
					...neutralDrillHull(),
					wornPumpSnapshot()
				])
			},
			eventWindows: plan.windows,
			responses,
			pilotFrame: 'engineer'
		});

		const efficientResult = resolveThumperRunResult({
			runConfig: {
				targetResourceId: 'veyrith_copper',
				projectedRecovery: plan.projectedRecovery,
				runSeed,
				partModifiers: computeThumperPartRunModifiers([
					...neutralDrillHull(),
					craftedEfficientPumpSnapshot()
				])
			},
			eventWindows: plan.windows,
			responses,
			pilotFrame: 'engineer'
		});

		expect(efficientResult.recoveredQuantity).toBeGreaterThan(wornResult.recoveredQuantity);
		expect(efficientResult.wasteQuantity).toBe(wornResult.wasteQuantity);
	});

	it('wear from a run lands only on the parts that ran', () => {
		const runParts: ThumperPartSnapshot[] = [
			{
				slot: 'drill',
				itemId: 'run-drill',
				schematicId: 'worn_basic_drill',
				displayName: 'Worn Basic Drill',
				propertyScores: { extraction_rate: 35 },
				condition: 80,
				integrity: 90
			},
			{
				slot: 'pump',
				itemId: 'run-pump',
				schematicId: 'worn_basic_pump',
				displayName: 'Worn Basic Pump',
				propertyScores: { recovery_efficiency: 35 },
				condition: 80,
				integrity: 90
			},
			{
				slot: 'hull',
				itemId: 'run-hull',
				schematicId: 'worn_basic_hull',
				displayName: 'Worn Basic Hull',
				propertyScores: { max_condition: 40 },
				condition: 80,
				integrity: 90
			}
		];

		const sparePump: ThumperPartSnapshot = {
			...runParts[1],
			itemId: 'bench-pump',
			condition: 100,
			integrity: 100
		};

		const deltas = computeRunPartWearDeltas(
			[
				{
					windowIndex: 1,
					complication: 'pump_strain',
					chosenResponse: 'hold',
					matchingAction: 'clear_pump_problem'
				}
			],
			{ isPushRun: false }
		);
		const afterRun = applyWearToRunParts(runParts, deltas);

		expect(afterRun.find((part) => part.itemId === 'run-drill')!.condition).toBeLessThan(80);
		expect(afterRun.find((part) => part.itemId === 'run-pump')!.condition).toBeLessThan(80);
		expect(sparePump.condition).toBe(100);
	});

	it('matching action wear lands on the related part slot only', () => {
		const deltas = computeRunPartWearDeltas(
			[
				{
					windowIndex: 1,
					complication: 'signal_drift',
					chosenResponse: 'signal_tune',
					matchingAction: 'signal_tune'
				}
			],
			{ isPushRun: false }
		);

		expect(deltas.drill.conditionLoss).toBe(2 + MATCHING_ACTION_WEAR_CONDITION);
		expect(deltas.pump.conditionLoss).toBe(3);
		expect(deltas.hull.conditionLoss).toBe(2);
	});

	it('a part at zero Condition degrades run performance but is not deleted', () => {
		expect(partConditionPerformanceMultiplier(0, 70)).toBe(0.5);

		const modifiers = computeThumperPartRunModifiers([
			{
				slot: 'pump',
				itemId: 'broken-pump',
				schematicId: 'worn_basic_pump',
				displayName: 'Worn Basic Pump',
				propertyScores: { recovery_efficiency: 35 },
				condition: 0,
				integrity: 70
			}
		]);

		expect(modifiers.performanceMultiplier).toBe(0.5);
		expect(modifiers.pumpRecoveryBonus).toBe(0);
	});
});
