import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../resources/redMesaBloom.js';
import { buildCraftResultExplanation } from './buildCraftResultExplanation.js';
import { resolveCraft } from './schematicEngine.js';
import { FIRST_SCANNER_SUGGESTED_TUNING } from './starterStockpile.js';
import { SURVEY_SCANNER_MK_I } from './schematics/surveyScannerMkI.js';
import type { SchematicSlotFill } from './types.js';

function scannerFills(): SchematicSlotFill[] {
	const core = getRedMesaResource('veyrith_copper');
	const lens = getRedMesaResource('pale_ember_crystal');
	const mount = getRedMesaResource('keth_iron');
	return [
		{
			slotId: 'conductive_core',
			resourceSlug: core.id,
			resourceDisplayName: core.displayName,
			family: core.family,
			stats: { ...core.stats }
		},
		{
			slotId: 'crystal_lens',
			resourceSlug: lens.id,
			resourceDisplayName: lens.displayName,
			family: lens.family,
			stats: { ...lens.stats }
		},
		{
			slotId: 'frame_mount',
			resourceSlug: mount.id,
			resourceDisplayName: mount.displayName,
			family: mount.family,
			stats: { ...mount.stats }
		}
	];
}

describe('buildCraftResultExplanation', () => {
	it('names resource stats that drove each property and describes tuning/mode', () => {
		const fills = scannerFills();
		const resolution = resolveCraft({
			schematic: SURVEY_SCANNER_MK_I,
			slotFills: fills,
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			mode: 'safe_craft'
		});

		const explanation = buildCraftResultExplanation({
			schematic: SURVEY_SCANNER_MK_I,
			slotFills: fills,
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			resolution
		});

		expect(explanation.summary).toContain('Veyrith Copper');
		expect(explanation.modeContribution).toContain('Safe Craft');
		expect(explanation.properties).toHaveLength(3);

		const clarity = explanation.properties.find((line) => line.propertyId === 'survey_clarity')!;
		expect(clarity.tuningPoints).toBe(2);
		expect(clarity.drivers[0]!.label).toContain('Conductivity');
		expect(clarity.drivers[0]!.weightPercent).toBeGreaterThanOrEqual(25);
	});
});
