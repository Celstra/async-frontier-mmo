import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../../resources/redMesaBloom.js';
import type { NamedResourceId } from '../../resources/types.js';
import { previewCraftProperties, resolveCraft } from '../schematicEngine.js';
import type { SchematicSlotFill } from '../types.js';
import { FIELD_REPAIR_KIT } from './fieldRepairKit.js';

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

function propertyScore(fills: SchematicSlotFill[], propertyId: string): number {
	const preview = previewCraftProperties(FIELD_REPAIR_KIT, fills);
	const line = preview.lines.find((candidate) => candidate.propertyId === propertyId);
	if (!line) {
		throw new Error(`Missing property ${propertyId}`);
	}
	return line.baseScore;
}

describe('Field Repair Kit schematic', () => {
	it('crafts through the same engine path as other MVP recipes', () => {
		const fills = [
			slotFill('patch_alloy', 'keth_iron'),
			slotFill('control_filament', 'veyrith_copper'),
			slotFill('reactive_binder', 'pale_ember_crystal')
		];
		const tuning = {
			condition_restored: 2,
			integrity_safety: 1,
			field_reliability: 0
		};

		const resolution = resolveCraft({
			schematic: FIELD_REPAIR_KIT,
			slotFills: fills,
			tuning,
			mode: 'safe_craft'
		});

		expect(resolution.lines).toHaveLength(3);
		expect(resolution.lines.every((line) => line.finalScore > 0)).toBe(true);
	});

	it('two kits crafted from different binders produce different Integrity Safety (016-B)', () => {
		const sharedPatch = slotFill('patch_alloy', 'keth_iron');
		const sharedFilament = slotFill('control_filament', 'veyrith_copper');

		const paleBinderSafety = propertyScore(
			[sharedPatch, sharedFilament, slotFill('reactive_binder', 'pale_ember_crystal')],
			'integrity_safety'
		);
		const thornwakeBinderSafety = propertyScore(
			[sharedPatch, sharedFilament, slotFill('reactive_binder', 'thornwake_crystal')],
			'integrity_safety'
		);

		expect(paleBinderSafety).not.toBe(thornwakeBinderSafety);
		expect(paleBinderSafety).toBeGreaterThan(thornwakeBinderSafety);
	});
});
