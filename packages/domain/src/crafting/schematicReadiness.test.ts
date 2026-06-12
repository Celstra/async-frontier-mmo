import { describe, expect, it } from 'vitest';
import { getRedMesaResource } from '../resources/redMesaBloom.js';
import { analyzeSchematicReadiness, type OwnedResourceStack } from './schematicReadiness.js';
import { SURVEY_SCANNER_MK_I } from './schematics/surveyScannerMkI.js';

function stack(
	resourceId: Parameters<typeof getRedMesaResource>[0],
	quantity: number
): OwnedResourceStack {
	const resource = getRedMesaResource(resourceId);
	return {
		resourceInstanceId: `inst-${resource.id}`,
		resourceSlug: resource.id,
		displayName: resource.displayName,
		family: resource.family,
		quantity
	};
}

describe('analyzeSchematicReadiness', () => {
	it('reports scanner craftable with full inventory', () => {
		const analysis = analyzeSchematicReadiness({
			schematic: SURVEY_SCANNER_MK_I,
			ownedStacks: [
				stack('veyrith_copper', 30),
				stack('pale_ember_crystal', 30),
				stack('keth_iron', 30)
			]
		});

		expect(analysis.craftableNow).toBe(true);
		expect(analysis.blockers).toHaveLength(0);
		expect(analysis.slots.every((slot) => slot.satisfiable)).toBe(true);
	});

	it('blocks scanner with only starter stockpile and names conductive thumper source', () => {
		const analysis = analyzeSchematicReadiness({
			schematic: SURVEY_SCANNER_MK_I,
			ownedStacks: [stack('keth_iron', 35), stack('pale_ember_crystal', 35)]
		});

		expect(analysis.craftableNow).toBe(false);
		expect(analysis.blockers).toHaveLength(1);
		expect(analysis.blockers[0]).toContain('Conductive Core');
		expect(analysis.blockers[0]).toContain('Conductive Metal');
		expect(analysis.blockers[0]).toContain('thumper hauls');

		const conductiveSlot = analysis.slots.find((slot) => slot.slotId === 'conductive_core');
		expect(conductiveSlot?.satisfiable).toBe(false);
		expect(conductiveSlot?.missing?.sourceHint).toContain('thumper hauls');
	});

	it('reports quantity-short when the family is owned but below inputQuantity', () => {
		const analysis = analyzeSchematicReadiness({
			schematic: SURVEY_SCANNER_MK_I,
			ownedStacks: [
				stack('veyrith_copper', 12),
				stack('pale_ember_crystal', 30),
				stack('keth_iron', 30)
			]
		});

		expect(analysis.craftableNow).toBe(false);
		expect(analysis.blockers[0]).toContain('Veyrith Copper only has 12');
		expect(analysis.blockers[0]).toContain('18 short');

		const conductiveSlot = analysis.slots.find((slot) => slot.slotId === 'conductive_core');
		expect(conductiveSlot?.missing?.quantityShort).toBe(18);
		expect(conductiveSlot?.bestCandidate?.displayName).toBe('Veyrith Copper');
		expect(conductiveSlot?.missing?.sourceHint).toContain('top up Veyrith Copper');
		expect(conductiveSlot?.missing?.sourceHint).toContain('Conductive Metal');
	});
});
