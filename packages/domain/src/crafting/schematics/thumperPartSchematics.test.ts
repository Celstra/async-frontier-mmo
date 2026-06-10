import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../../resources/redMesaBloom.js';
import type { NamedResourceId } from '../../resources/types.js';
import { previewCraftProperties, resolveCraft } from '../schematicEngine.js';
import type { SchematicDefinition, SchematicSlotFill } from '../types.js';
import { BASIC_DRILL_HEAD } from './basicDrillHead.js';
import { EFFICIENT_PUMP } from './efficientPump.js';
import { FIELD_REPAIR_KIT } from './fieldRepairKit.js';
import {
	MVP_THUMPER_PART_SCHEMATICS,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I
} from './index.js';

function slotFill(slotId: string, resourceId: NamedResourceId): SchematicSlotFill {
	const resource = getRedMesaResource(resourceId);
	return {
		slotId,
		resourceSlug: resource.id,
		resourceDisplayName: resource.displayName,
		family: resource.family,
		stats: { ...resource.stats }
	};
}

function lineBase(
	schematic: SchematicDefinition,
	fills: SchematicSlotFill[],
	propertyId: string
): number {
	const preview = previewCraftProperties(schematic, fills);
	const line = preview.lines.find((candidate) => candidate.propertyId === propertyId);
	if (!line) {
		throw new Error(`Missing property ${propertyId}`);
	}
	return line.baseScore;
}

describe('MVP thumper-part schematics as data', () => {
	it('all four thumper-part schematics craft through the same engine path', () => {
		const fillsBySchematic: Record<string, SchematicSlotFill[]> = {
			basic_drill_head: [
				slotFill('cutting_bit', 'asterion_frame_alloy'),
				slotFill('conductive_coil', 'veyrith_copper'),
				slotFill('resonance_crystal', 'pale_ember_crystal')
			],
			efficient_pump: [
				slotFill('intake_manifold', 'sorrel_vein_copper'),
				slotFill('flexible_housing', 'bendrel_ridge_alloy'),
				slotFill('flow_crystal', 'glimmerfall_shard')
			],
			reinforced_hull_plate: [
				slotFill('outer_plate', 'asterion_frame_alloy'),
				slotFill('bracing_layer', 'bendrel_ridge_alloy'),
				slotFill('bonding_matrix', 'pale_ember_crystal')
			],
			survey_scanner_mk_i: [
				slotFill('conductive_core', 'veyrith_copper'),
				slotFill('crystal_lens', 'pale_ember_crystal'),
				slotFill('frame_mount', 'keth_iron')
			]
		};

		for (const schematic of MVP_THUMPER_PART_SCHEMATICS) {
			const fills = fillsBySchematic[schematic.id];
			const tuning = Object.fromEntries(
				schematic.properties.map((property, index) => [
					property.id,
					index === 0 ? 2 : index === 1 ? 1 : 0
				])
			);

			const preview = previewCraftProperties(schematic, fills, tuning);
			expect(preview.schematicId).toBe(schematic.id);
			expect(preview.lines).toHaveLength(3);

			const resolution = resolveCraft({
				schematic,
				slotFills: fills,
				tuning,
				mode: 'safe_craft'
			});
			expect(resolution.lines).toHaveLength(3);
			expect(resolution.lines.every((line) => line.finalScore > 0)).toBe(true);
		}
	});

	it('Asterion-heavy inputs beat Keth-heavy inputs on Drill Extraction Rate', () => {
		const asterionHeavy = [
			slotFill('cutting_bit', 'asterion_frame_alloy'),
			slotFill('conductive_coil', 'veyrith_copper'),
			slotFill('resonance_crystal', 'pale_ember_crystal')
		];
		const kethHeavy = [
			slotFill('cutting_bit', 'keth_iron'),
			slotFill('conductive_coil', 'veyrith_copper'),
			slotFill('resonance_crystal', 'pale_ember_crystal')
		];

		expect(
			lineBase(BASIC_DRILL_HEAD, asterionHeavy, 'extraction_rate')
		).toBeGreaterThan(lineBase(BASIC_DRILL_HEAD, kethHeavy, 'extraction_rate'));
	});

	it('each recipe property lines produce different rankings across input combos', () => {
		const drillCombos = [
			[
				slotFill('cutting_bit', 'asterion_frame_alloy'),
				slotFill('conductive_coil', 'veyrith_copper'),
				slotFill('resonance_crystal', 'thornwake_crystal')
			],
			[
				slotFill('cutting_bit', 'keth_iron'),
				slotFill('conductive_coil', 'red_mesa_conductive_slag'),
				slotFill('resonance_crystal', 'pale_ember_crystal')
			],
			[
				slotFill('cutting_bit', 'bendrel_ridge_alloy'),
				slotFill('conductive_coil', 'sorrel_vein_copper'),
				slotFill('resonance_crystal', 'glimmerfall_shard')
			]
		];

		const pumpCombos = [
			[
				slotFill('intake_manifold', 'veyrith_copper'),
				slotFill('flexible_housing', 'bendrel_ridge_alloy'),
				slotFill('flow_crystal', 'pale_ember_crystal')
			],
			[
				slotFill('intake_manifold', 'sorrel_vein_copper'),
				slotFill('flexible_housing', 'keth_iron'),
				slotFill('flow_crystal', 'thornwake_crystal')
			],
			[
				slotFill('intake_manifold', 'red_mesa_conductive_slag'),
				slotFill('flexible_housing', 'asterion_frame_alloy'),
				slotFill('flow_crystal', 'glimmerfall_shard')
			]
		];

		const hullCombos = [
			[
				slotFill('outer_plate', 'asterion_frame_alloy'),
				slotFill('bracing_layer', 'bendrel_ridge_alloy'),
				slotFill('bonding_matrix', 'pale_ember_crystal')
			],
			[
				slotFill('outer_plate', 'asterion_frame_alloy'),
				slotFill('bracing_layer', 'bendrel_ridge_alloy'),
				slotFill('bonding_matrix', 'glimmerfall_shard')
			],
			[
				slotFill('outer_plate', 'keth_iron'),
				slotFill('bracing_layer', 'keth_iron'),
				slotFill('bonding_matrix', 'thornwake_crystal')
			]
		];

		function distinctPropertyWinners(
			schematic: SchematicDefinition,
			combos: SchematicSlotFill[][]
		): number {
			const winners = schematic.properties.map((property) => {
				let bestIndex = 0;
				let bestScore = -1;
				combos.forEach((fills, index) => {
					const score = lineBase(schematic, fills, property.id);
					if (score > bestScore) {
						bestScore = score;
						bestIndex = index;
					}
				});
				return bestIndex;
			});
			return new Set(winners).size;
		}

		expect(distinctPropertyWinners(BASIC_DRILL_HEAD, drillCombos)).toBeGreaterThan(1);
		expect(distinctPropertyWinners(EFFICIENT_PUMP, pumpCombos)).toBeGreaterThan(1);
		expect(distinctPropertyWinners(REINFORCED_HULL_PLATE, hullCombos)).toBeGreaterThan(1);
	});

	it('best CM for Scanner is Veyrith, for Pump Field Stability is Sorrel, for Repair filament is Slag', () => {
		const sharedRc = slotFill('crystal_lens', 'pale_ember_crystal');
		const sharedSa = slotFill('frame_mount', 'keth_iron');

		const veyrithScanner = lineBase(
			SURVEY_SCANNER_MK_I,
			[slotFill('conductive_core', 'veyrith_copper'), sharedRc, sharedSa],
			'survey_clarity'
		);
		const sorrelScanner = lineBase(
			SURVEY_SCANNER_MK_I,
			[slotFill('conductive_core', 'sorrel_vein_copper'), sharedRc, sharedSa],
			'survey_clarity'
		);
		expect(veyrithScanner).toBeGreaterThan(sorrelScanner);

		const sharedPumpSa = slotFill('flexible_housing', 'bendrel_ridge_alloy');
		const sharedPumpRc = slotFill('flow_crystal', 'pale_ember_crystal');

		const veyrithPumpStability = lineBase(
			EFFICIENT_PUMP,
			[slotFill('intake_manifold', 'veyrith_copper'), sharedPumpSa, sharedPumpRc],
			'field_stability'
		);
		const sorrelPumpStability = lineBase(
			EFFICIENT_PUMP,
			[slotFill('intake_manifold', 'sorrel_vein_copper'), sharedPumpSa, sharedPumpRc],
			'field_stability'
		);
		expect(sorrelPumpStability).toBeGreaterThan(veyrithPumpStability);

		const repairFills = (filamentId: NamedResourceId) => [
			slotFill('patch_alloy', 'keth_iron'),
			slotFill('control_filament', filamentId),
			slotFill('reactive_binder', 'pale_ember_crystal')
		];

		const slagReliability = lineBase(
			FIELD_REPAIR_KIT,
			repairFills('red_mesa_conductive_slag'),
			'field_reliability'
		);
		const veyrithReliability = lineBase(
			FIELD_REPAIR_KIT,
			repairFills('veyrith_copper'),
			'field_reliability'
		);
		expect(slagReliability).toBeGreaterThan(veyrithReliability);
	});
});
