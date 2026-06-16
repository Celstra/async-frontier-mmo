import { describe, expect, it } from 'vitest';
import { THUMPER_CHASSIS_ASSEMBLY } from '../crafting/schematics/thumperChassisAssembly.js';
import { MVP_CRAFT_SCHEMATICS } from '../crafting/schematics/index.js';
import { WORKSHOP_STARTER_GRANT_UNITS } from './benchResources.js';
import {
	buildWorkshopStarterGrant,
	canCraftAnyWorkshopThumperPart,
	isWorkshopActiveSchematic,
	isWorkshopChassisAssemblyEnabled,
	isWorkshopHiddenSchematic,
	isWorkshopStationEnabled,
	WORKSHOP_ACTIVE_SCHEMATIC_IDS,
	WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS,
	WORKSHOP_CHASSIS_ASSEMBLY_ID,
	WORKSHOP_ENABLED_STATION_IDS,
	WORKSHOP_HIDDEN_SCHEMATIC_IDS
} from './workshopSlice.js';

describe('workshop slice', () => {
	it('exposes only the three active thumper-part schematics', () => {
		expect(WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS).toHaveLength(3);
		expect(WORKSHOP_ACTIVE_SCHEMATIC_IDS).toEqual([
			'basic_drill_head',
			'efficient_pump',
			'reinforced_hull_plate'
		]);
		expect(WORKSHOP_ACTIVE_SCHEMATIC_IDS.every((id) => isWorkshopActiveSchematic(id))).toBe(true);
		expect(MVP_CRAFT_SCHEMATICS.length).toBeGreaterThan(WORKSHOP_ACTIVE_SCHEMATIC_IDS.length);
	});

	it('marks non-slice MVP schematics as hidden from workshop-first workflow', () => {
		for (const hiddenId of WORKSHOP_HIDDEN_SCHEMATIC_IDS) {
			expect(isWorkshopHiddenSchematic(hiddenId)).toBe(true);
			expect(isWorkshopActiveSchematic(hiddenId)).toBe(false);
		}
	});

	it('disables chassis assembly and the thumper station for workshop-first slice', () => {
		expect(WORKSHOP_CHASSIS_ASSEMBLY_ID).toBe(THUMPER_CHASSIS_ASSEMBLY.id);
		expect(isWorkshopChassisAssemblyEnabled()).toBe(false);
		expect(WORKSHOP_ENABLED_STATION_IDS).toEqual(['fabricator']);
		expect(isWorkshopStationEnabled('fabricator')).toBe(true);
		expect(isWorkshopStationEnabled('thumper')).toBe(false);
	});

	it('builds the starter grant as 180u per bench resource', () => {
		const grant = buildWorkshopStarterGrant();
		expect(grant).toHaveLength(9);
		expect(grant.every((line) => line.quantity === WORKSHOP_STARTER_GRANT_UNITS)).toBe(true);
		expect(new Set(grant.map((line) => line.resourceSlug)).size).toBe(9);
	});

	it('detects when bench stock can craft at least one active thumper part', () => {
		const craftableStacks = [
			{
				resourceInstanceId: 'keth',
				resourceSlug: 'keth_iron',
				displayName: 'Keth Iron',
				family: 'structural_alloy' as const,
				quantity: 120
			},
			{
				resourceInstanceId: 'copper',
				resourceSlug: 'veyrith_copper',
				displayName: 'Veyrith Copper',
				family: 'conductive_metal' as const,
				quantity: 120
			},
			{
				resourceInstanceId: 'pale',
				resourceSlug: 'pale_ember_crystal',
				displayName: 'Pale Ember Crystal',
				family: 'reactive_crystal' as const,
				quantity: 120
			}
		];

		expect(canCraftAnyWorkshopThumperPart(craftableStacks)).toBe(true);
		expect(
			canCraftAnyWorkshopThumperPart(
				craftableStacks.map((stack) => ({ ...stack, quantity: 10 }))
			)
		).toBe(false);
	});
});
