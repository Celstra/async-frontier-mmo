import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../resources/redMesaBloom.js';
import type { CompleteResourceStatMap } from '../resources/types.js';
import { getPropertyOutputBand } from './propertyBand.js';
import {
	computeTunedPropertyScore,
	previewCraftProperties,
	resolveCraft,
	SchematicSlotValidationError,
	TUNING_POINTS_TOTAL,
	TuningValidationError,
	validateCraftTuningAllocation,
	validateTuningAllocation
} from './schematicEngine.js';
import { SURVEY_SCANNER_MK_I } from './schematics/surveyScannerMkI.js';
import type { SchematicSlotFill } from './types.js';

function slotFill(slotId: string, resourceId: Parameters<typeof getRedMesaResource>[0]): SchematicSlotFill {
	const resource = getRedMesaResource(resourceId);
	return {
		slotId,
		resourceSlug: resource.id,
		resourceDisplayName: resource.displayName,
		family: resource.family,
		stats: { ...resource.stats }
	};
}

function scannerFills(
	coreId: Parameters<typeof getRedMesaResource>[0],
	lensId: Parameters<typeof getRedMesaResource>[0],
	mountId: Parameters<typeof getRedMesaResource>[0] = 'keth_iron'
): SchematicSlotFill[] {
	return [
		slotFill('conductive_core', coreId),
		slotFill('crystal_lens', lensId),
		slotFill('frame_mount', mountId)
	];
}

function lineScore(
	fills: SchematicSlotFill[],
	propertyId: string,
	tuning: Record<string, number> = {}
): number {
	const preview = previewCraftProperties(SURVEY_SCANNER_MK_I, fills, tuning);
	const line = preview.lines.find((candidate) => candidate.propertyId === propertyId);
	if (!line) {
		throw new Error(`Missing property ${propertyId}`);
	}
	return line.tunedScore;
}

const FULL_TUNING = {
	survey_clarity: 2,
	stat_hint_accuracy: 1,
	signal_range: 0
};

describe('Survey Scanner Module Mk I schematic engine', () => {
	it('Veyrith Copper core beats Slag on all three lines by more than 3 tuning points can close', () => {
		const veyrithFills = scannerFills('veyrith_copper', 'pale_ember_crystal');
		const slagFills = scannerFills('red_mesa_conductive_slag', 'pale_ember_crystal');

		for (const propertyId of ['survey_clarity', 'stat_hint_accuracy', 'signal_range'] as const) {
			const veyrithScore = lineScore(veyrithFills, propertyId);
			const slagMaxTuned = lineScore(slagFills, propertyId, { [propertyId]: TUNING_POINTS_TOTAL });

			expect(veyrithScore).toBeGreaterThan(slagMaxTuned);
		}
	});

	it('Thornwake lens wins Survey Clarity and loses Stat Hint Accuracy and Signal Range vs Pale Ember', () => {
		const thornFills = scannerFills('veyrith_copper', 'thornwake_crystal');
		const paleFills = scannerFills('veyrith_copper', 'pale_ember_crystal');

		expect(lineScore(thornFills, 'survey_clarity')).toBeGreaterThan(
			lineScore(paleFills, 'survey_clarity')
		);
		expect(lineScore(thornFills, 'stat_hint_accuracy')).toBeLessThan(
			lineScore(paleFills, 'stat_hint_accuracy')
		);
		expect(lineScore(thornFills, 'signal_range')).toBeLessThan(lineScore(paleFills, 'signal_range'));
	});

	it('rejects a 4th tuning point and never mutates resource stats', () => {
		const fills = scannerFills('veyrith_copper', 'pale_ember_crystal');
		const snapshot: CompleteResourceStatMap = { ...fills[0].stats };

		expect(() =>
			validateTuningAllocation(SURVEY_SCANNER_MK_I, {
				survey_clarity: 2,
				stat_hint_accuracy: 1,
				signal_range: 1
			})
		).toThrow(TuningValidationError);

		previewCraftProperties(SURVEY_SCANNER_MK_I, fills, {
			survey_clarity: 2,
			stat_hint_accuracy: 1
		});

		expect(fills[0].stats).toEqual(snapshot);
	});

	it('rejects wrong resource family in a slot', () => {
		const fills = scannerFills('veyrith_copper', 'pale_ember_crystal');
		const wrongCore: SchematicSlotFill = {
			...fills[0],
			slotId: 'conductive_core',
			resourceSlug: 'keth_iron',
			resourceDisplayName: 'Keth Iron',
			family: 'structural_alloy'
		};

		expect(() =>
			previewCraftProperties(SURVEY_SCANNER_MK_I, [wrongCore, fills[1], fills[2]])
		).toThrow(SchematicSlotValidationError);
	});

	it('resolveCraft requires exactly 3 tuning points', () => {
		const fills = scannerFills('veyrith_copper', 'pale_ember_crystal');

		expect(() =>
			validateCraftTuningAllocation(SURVEY_SCANNER_MK_I, { survey_clarity: 2 })
		).toThrow(TuningValidationError);

		expect(() =>
			resolveCraft({
				schematic: SURVEY_SCANNER_MK_I,
				slotFills: fills,
				tuning: { survey_clarity: 2, stat_hint_accuracy: 0 },
				mode: 'safe_craft'
			})
		).toThrow(TuningValidationError);
	});

	it('Experimentation applies two seeded pulses', () => {
		const fills = scannerFills('veyrith_copper', 'pale_ember_crystal');

		const result = resolveCraft({
			schematic: SURVEY_SCANNER_MK_I,
			slotFills: fills,
			tuning: FULL_TUNING,
			mode: 'careful_experiment',
			experimentSeed: 'experiment-smoke',
			experimentPulses: [
				{ propertyId: 'survey_clarity', push: 'careful' },
				{ propertyId: 'signal_range', push: 'standard' }
			]
		});

		expect(result.experimentPulseResults).toHaveLength(2);
		expect(result.lines.every((line) => line.finalScore >= 0 && line.finalScore <= 100)).toBe(
			true
		);
	});
});

describe('Decision 010 property output bands', () => {
	it('maps crafted scores to Poor through Exceptional, never Legendary', () => {
		expect(getPropertyOutputBand(39)).toBe('poor');
		expect(getPropertyOutputBand(40)).toBe('basic');
		expect(getPropertyOutputBand(54)).toBe('basic');
		expect(getPropertyOutputBand(55)).toBe('solid');
		expect(getPropertyOutputBand(69)).toBe('solid');
		expect(getPropertyOutputBand(70)).toBe('strong');
		expect(getPropertyOutputBand(84)).toBe('strong');
		expect(getPropertyOutputBand(85)).toBe('excellent');
		expect(getPropertyOutputBand(94)).toBe('excellent');
		expect(getPropertyOutputBand(95)).toBe('exceptional');
		expect(getPropertyOutputBand(100)).toBe('exceptional');
	});
});

describe('tuning math', () => {
	it('applies +5% relative per point and caps at 100', () => {
		expect(computeTunedPropertyScore(80, 0)).toBe(80);
		expect(computeTunedPropertyScore(80, 3)).toBe(92);
		expect(computeTunedPropertyScore(90, 3)).toBe(100);
	});
});
