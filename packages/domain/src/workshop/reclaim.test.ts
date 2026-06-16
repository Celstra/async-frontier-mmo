import { describe, expect, it } from 'vitest';
import { BASIC_DRILL_HEAD } from '../crafting/schematics/index.js';
import type { NamedResourceId } from '../resources/types.js';
import { WORKSHOP_STARTER_GRANT_UNITS } from './benchResources.js';
import { WORKSHOP_RECLAIM_RATE } from './constants.js';
import {
	assertCanReclaimWorkshopItem,
	aggregateProvenanceByResourceInstance,
	canReclaimWorkshopItem,
	computeReclaimReturns,
	computeReclaimReturnsByResourceInstance,
	floorReclaimQuantity,
	previewWorkshopItemReclaimFromProvenance,
	totalConsumedUnits,
	totalReturnedUnits,
	type WorkshopConsumedResource
} from './reclaim.js';
import { buildWorkshopStarterGrant } from './workshopSlice.js';

function schematicConsumption(picks: Record<string, NamedResourceId>): WorkshopConsumedResource[] {
	const schematic = BASIC_DRILL_HEAD;

	const consumed = new Map<NamedResourceId, number>();
	for (const slot of schematic.slots) {
		const resourceSlug = picks[slot.id];
		if (!resourceSlug) {
			throw new Error(`Missing pick for slot ${slot.id}`);
		}
		consumed.set(resourceSlug, (consumed.get(resourceSlug) ?? 0) + slot.inputQuantity);
	}

	return [...consumed.entries()].map(([resourceSlug, quantity]) => ({ resourceSlug, quantity }));
}

describe('workshop reclaim', () => {
	it('returns less than consumed and preserves resource identity', () => {
		const consumed: WorkshopConsumedResource[] = [
			{ resourceSlug: 'keth_iron', quantity: 40 },
			{ resourceSlug: 'sorrel_vein_copper', quantity: 40 },
			{ resourceSlug: 'pale_ember_crystal', quantity: 40 }
		];

		const returned = computeReclaimReturns(consumed);
		expect(returned).toEqual([
			{ resourceSlug: 'keth_iron', quantity: 10 },
			{ resourceSlug: 'sorrel_vein_copper', quantity: 10 },
			{ resourceSlug: 'pale_ember_crystal', quantity: 10 }
		]);
		expect(totalReturnedUnits(returned)).toBeLessThan(totalConsumedUnits(consumed));
	});

	it('floors returned units to the stable 5u increment', () => {
		expect(floorReclaimQuantity(20, WORKSHOP_RECLAIM_RATE)).toBe(5);
		expect(floorReclaimQuantity(60, WORKSHOP_RECLAIM_RATE)).toBe(20);
		expect(floorReclaimQuantity(100, WORKSHOP_RECLAIM_RATE)).toBe(35);
	});

	it('aggregates duplicate resource instances before reclaim preview and returns', () => {
		const provenance = [
			{
				resourceInstanceId: 'hull-keth',
				resourceSlug: 'keth_iron' as const,
				resourceDisplayName: 'Keth Iron (Bench)',
				quantityConsumed: 60
			},
			{
				resourceInstanceId: 'hull-keth',
				resourceSlug: 'keth_iron' as const,
				resourceDisplayName: 'Keth Iron (Bench)',
				quantityConsumed: 40
			},
			{
				resourceInstanceId: 'hull-pale',
				resourceSlug: 'pale_ember_crystal' as const,
				resourceDisplayName: 'Pale Ember Crystal (Bench)',
				quantityConsumed: 20
			}
		];

		const preview = previewWorkshopItemReclaimFromProvenance(provenance);
		expect(preview).toEqual([
			{
				resourceInstanceId: 'hull-keth',
				resourceSlug: 'keth_iron',
				resourceDisplayName: 'Keth Iron (Bench)',
				quantity: 35
			},
			{
				resourceInstanceId: 'hull-pale',
				resourceSlug: 'pale_ember_crystal',
				resourceDisplayName: 'Pale Ember Crystal (Bench)',
				quantity: 5
			}
		]);

		const aggregated = aggregateProvenanceByResourceInstance(provenance);
		expect(computeReclaimReturnsByResourceInstance(aggregated)).toEqual([
			{
				resourceInstanceId: 'hull-keth',
				resourceSlug: 'keth_iron',
				quantity: 35
			},
			{
				resourceInstanceId: 'hull-pale',
				resourceSlug: 'pale_ember_crystal',
				quantity: 5
			}
		]);
	});

	it('cannot reclaim the same item twice in the pure-rule model', () => {
		const item = { reclaimedAt: null as Date | null };
		expect(canReclaimWorkshopItem(item)).toBe(true);
		item.reclaimedAt = new Date();
		expect(canReclaimWorkshopItem(item)).toBe(false);
		expect(() => assertCanReclaimWorkshopItem(item)).toThrow(/already been reclaimed/);
	});

	it('craft then reclaim never increases total material across active schematics', () => {
		const inventory = new Map<NamedResourceId, number>(
			buildWorkshopStarterGrant().map((line) => [line.resourceSlug, line.quantity])
		);

		/** Rotate drill picks across bench identities to spread family drain without crates. */
		const drillRotations: Record<string, NamedResourceId>[] = [
			{
				cutting_bit: 'keth_iron',
				conductive_coil: 'sorrel_vein_copper',
				resonance_crystal: 'pale_ember_crystal'
			},
			{
				cutting_bit: 'asterion_frame_alloy',
				conductive_coil: 'veyrith_copper',
				resonance_crystal: 'thornwake_crystal'
			},
			{
				cutting_bit: 'bendrel_ridge_alloy',
				conductive_coil: 'red_mesa_conductive_slag',
				resonance_crystal: 'glimmerfall_shard'
			}
		];

		let netDelta = 0;
		const expectedIterations = 12;
		let completedIterations = 0;

		for (let iteration = 0; iteration < expectedIterations; iteration += 1) {
			const picks = drillRotations[iteration % drillRotations.length]!;
			const consumed = schematicConsumption(picks);
			const before = [...inventory.values()].reduce((sum, qty) => sum + qty, 0);

			for (const line of consumed) {
				const remaining = (inventory.get(line.resourceSlug) ?? 0) - line.quantity;
				expect(remaining).toBeGreaterThanOrEqual(0);
				inventory.set(line.resourceSlug, remaining);
			}

			const returned = computeReclaimReturns(consumed);
			for (const line of returned) {
				inventory.set(line.resourceSlug, (inventory.get(line.resourceSlug) ?? 0) + line.quantity);
			}

			const after = [...inventory.values()].reduce((sum, qty) => sum + qty, 0);
			netDelta += after - before;
			expect(after).toBeLessThanOrEqual(before);
			completedIterations += 1;
		}

		expect(completedIterations).toBe(expectedIterations);
		expect(netDelta).toBeLessThan(0);
		expect([...inventory.values()].reduce((sum, qty) => sum + qty, 0)).toBeLessThan(
			WORKSHOP_STARTER_GRANT_UNITS * 9
		);
	});
});
