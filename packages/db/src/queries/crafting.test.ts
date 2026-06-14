import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	FIRST_SCANNER_SUGGESTED_TUNING,
	REINFORCED_HULL_PLATE,
	resolveExperimentationPulses,
	SURVEY_SCANNER_MK_I
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { craftingAttempts } from '../schema/craftingAttempts.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { craftSchematicForPilot, craftSurveyScannerForPilot } from './crafting.js';
import { listEconomyLedgerEntriesForPilot } from './economyLedger.js';
import { grantResourceToPilot, getResourceStackForPilotInstance } from './resourceGrants.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

function scannerSlotInputs(instances: {
	coreId: string;
	lensId: string;
	mountId: string;
}) {
	return [
		{ slotId: 'conductive_core', resourceInstanceId: instances.coreId },
		{ slotId: 'crystal_lens', resourceInstanceId: instances.lensId },
		{ slotId: 'frame_mount', resourceInstanceId: instances.mountId }
	];
}

function scannerSlotQuantity(slotId: string): number {
	const slot = SURVEY_SCANNER_MK_I.slots.find((candidate) => candidate.id === slotId);
	if (!slot) {
		throw new Error(`Unknown scanner slot: ${slotId}`);
	}
	return slot.inputQuantity;
}

function findOverdriveScrapSeed(): string {
	const pulses = [
		{ propertyId: 'max_condition', push: 'overdrive' as const },
		{ propertyId: 'damage_reduction', push: 'careful' as const }
	];

	for (let index = 0; index < 5_000; index += 1) {
		const seed = `overdrive-scrap-${index}`;
		const result = resolveExperimentationPulses({
			preview: {
				schematicId: REINFORCED_HULL_PLATE.id,
				schematicVersion: REINFORCED_HULL_PLATE.version,
				lines: REINFORCED_HULL_PLATE.properties.map((property) => ({
					propertyId: property.id,
					displayName: property.displayName,
					baseScore: 60,
					tunedScore: 62,
					resourceCeiling: 80,
					tunedBand: 'solid' as const,
					ceilingBand: 'strong' as const
				}))
			},
			schematic: REINFORCED_HULL_PLATE,
			slotFills: [],
			pulses,
			experimentSeed: seed
		});

		if (result.totalScrapUnits > 0) {
			return seed;
		}
	}

	throw new Error('Could not find an Overdrive scrap seed for craft test');
}

describeDb('transactional scanner craft', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-16-craft-${Date.now()}`;

	let veyrithInstanceId = '';
	let kethInstanceId = '';
	let paleInstanceId = '';
	let asterionInstanceId = '';

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();

		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
		const pale = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'pale_ember_crystal');
		const asterion = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'asterion_frame_alloy');
		expect(veyrith).not.toBeNull();
		expect(keth).not.toBeNull();
		expect(pale).not.toBeNull();
		expect(asterion).not.toBeNull();

		veyrithInstanceId = veyrith!.id;
		kethInstanceId = keth!.id;
		paleInstanceId = pale!.id;
		asterionInstanceId = asterion!.id;

		const craftSetup = { type: 'test_grant' as const, id: 'scanner-craft-setup' };
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			quantity: 60,
			source: craftSetup
		});
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: kethInstanceId,
			quantity: 60,
			source: craftSetup
		});
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: paleInstanceId,
			quantity: 60,
			source: craftSetup
		});
	});

	afterAll(async () => {
		await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, testPilotId));
		await db.delete(items).where(eq(items.pilotId, testPilotId));
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('fails cleanly when slot family is wrong or quantity is short', async () => {
		const wrongFamily = await craftSurveyScannerForPilot(db, {
			pilotId: testPilotId,
			idempotencyKey: `invalid-family-${Date.now()}`,
			slotInputs: scannerSlotInputs({
				coreId: kethInstanceId,
				lensId: paleInstanceId,
				mountId: kethInstanceId
			}),
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			craftMode: 'safe_craft'
		});

		expect(wrongFamily.status).toBe('invalid_craft');
		if (wrongFamily.status === 'invalid_craft') {
			expect(wrongFamily.reason).toContain('conductive_core');
		}

		const shortQty = await craftSurveyScannerForPilot(db, {
			pilotId: testPilotId,
			idempotencyKey: `invalid-qty-${Date.now()}`,
			slotInputs: scannerSlotInputs({
				coreId: veyrithInstanceId,
				lensId: paleInstanceId,
				mountId: asterionInstanceId
			}),
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			craftMode: 'safe_craft'
		});

		expect(shortQty.status).toBe('invalid_craft');
		if (shortQty.status === 'invalid_craft') {
			expect(shortQty.reason).toContain('Insufficient');
		}
	});

	it('double-submit with the same idempotency key cannot consume twice or create two items', async () => {
		const idempotencyKey = `scanner-once-${Date.now()}`;
		const slotInputs = scannerSlotInputs({
			coreId: veyrithInstanceId,
			lensId: paleInstanceId,
			mountId: kethInstanceId
		});

		const stacksBefore = await db
			.select()
			.from(resourceStacks)
			.where(eq(resourceStacks.pilotId, testPilotId));

		const first = await craftSurveyScannerForPilot(db, {
			pilotId: testPilotId,
			idempotencyKey,
			slotInputs,
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			craftMode: 'safe_craft'
		});

		expect(first.status).toBe('crafted');

		const second = await craftSurveyScannerForPilot(db, {
			pilotId: testPilotId,
			idempotencyKey,
			slotInputs,
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			craftMode: 'safe_craft'
		});

		expect(second.status).toBe('already_crafted');
		if (first.status === 'crafted' && second.status === 'already_crafted') {
			expect(second.item.id).toBe(first.item.id);
			expect(second.attempt.id).toBe(first.attempt.id);
		}

		const stacksAfter = await db
			.select()
			.from(resourceStacks)
			.where(eq(resourceStacks.pilotId, testPilotId));

		for (const stackBefore of stacksBefore) {
			const stackAfter = stacksAfter.find((row) => row.id === stackBefore.id);
			let expectedDelta = 0;
			if (stackBefore.resourceInstanceId === veyrithInstanceId) {
				expectedDelta = scannerSlotQuantity('conductive_core');
			} else if (stackBefore.resourceInstanceId === paleInstanceId) {
				expectedDelta = scannerSlotQuantity('crystal_lens');
			} else if (stackBefore.resourceInstanceId === kethInstanceId) {
				expectedDelta = scannerSlotQuantity('frame_mount');
			}
			expect(stackAfter?.quantity).toBe(stackBefore.quantity - expectedDelta);
		}

		if (first.status !== 'crafted') {
			throw new Error('expected first craft to succeed');
		}

		const pilotItems = await db.select().from(items).where(eq(items.pilotId, testPilotId));
		const scannerItems = pilotItems.filter(
			(item) => item.schematicId === SURVEY_SCANNER_MK_I.id
		);
		expect(scannerItems.filter((item) => item.id === first.item.id)).toHaveLength(1);
	});

	it('item provenance lists the exact resource instances consumed', async () => {
		const idempotencyKey = `scanner-provenance-${Date.now()}`;
		const result = await craftSurveyScannerForPilot(db, {
			pilotId: testPilotId,
			idempotencyKey,
			slotInputs: scannerSlotInputs({
				coreId: veyrithInstanceId,
				lensId: paleInstanceId,
				mountId: kethInstanceId
			}),
			tuning: FIRST_SCANNER_SUGGESTED_TUNING,
			craftMode: 'safe_craft'
		});

		expect(result.status).toBe('crafted');
		if (result.status !== 'crafted') {
			return;
		}

		expect(result.item.provenance).toEqual([
			expect.objectContaining({
				slotId: 'conductive_core',
				resourceInstanceId: veyrithInstanceId,
				quantityConsumed: scannerSlotQuantity('conductive_core')
			}),
			expect.objectContaining({
				slotId: 'crystal_lens',
				resourceInstanceId: paleInstanceId,
				quantityConsumed: scannerSlotQuantity('crystal_lens')
			}),
			expect.objectContaining({
				slotId: 'frame_mount',
				resourceInstanceId: kethInstanceId,
				quantityConsumed: scannerSlotQuantity('frame_mount')
			})
		]);
	});

	it('rejects reusing one stack across two slots when combined quantity is short', async () => {
		const hullPilotId = `hull-craft-${Date.now()}`;
		await db.insert(pilots).values({ id: hullPilotId }).onConflictDoNothing();

		const craftSetup = { type: 'test_grant' as const, id: 'hull-craft-setup' };
		await grantResourceToPilot(db, {
			pilotId: hullPilotId,
			resourceInstanceId: kethInstanceId,
			quantity: 70,
			source: craftSetup
		});
		await grantResourceToPilot(db, {
			pilotId: hullPilotId,
			resourceInstanceId: paleInstanceId,
			quantity: 20,
			source: craftSetup
		});

		const result = await craftSchematicForPilot(db, {
			pilotId: hullPilotId,
			idempotencyKey: `hull-short-${Date.now()}`,
			schematic: REINFORCED_HULL_PLATE,
			slotInputs: [
				{ slotId: 'outer_plate', resourceInstanceId: kethInstanceId },
				{ slotId: 'bracing_layer', resourceInstanceId: kethInstanceId },
				{ slotId: 'bonding_matrix', resourceInstanceId: paleInstanceId }
			],
			tuning: { max_condition: 1, damage_reduction: 1, repairability: 1 },
			craftMode: 'safe_craft'
		});

		expect(result.status).toBe('invalid_craft');
		if (result.status === 'invalid_craft') {
			expect(result.reason).toContain('already assigned');
		}
	});

	it('debits Overdrive scrap units from the largest socket stack', async () => {
		const hullPilotId = `hull-scrap-${Date.now()}`;
		await db.insert(pilots).values({ id: hullPilotId }).onConflictDoNothing();

		const craftSetup = { type: 'test_grant' as const, id: 'hull-scrap-setup' };
		const scrapSeed = findOverdriveScrapSeed();
		const scrapUnits = 60;

		await grantResourceToPilot(db, {
			pilotId: hullPilotId,
			resourceInstanceId: kethInstanceId,
			quantity: 60 + 40 + scrapUnits,
			source: craftSetup
		});
		await grantResourceToPilot(db, {
			pilotId: hullPilotId,
			resourceInstanceId: paleInstanceId,
			quantity: 20,
			source: craftSetup
		});

		const beforeKeth = await getResourceStackForPilotInstance(db, hullPilotId, kethInstanceId);
		expect(beforeKeth?.quantity).toBe(160);

		const result = await craftSchematicForPilot(db, {
			pilotId: hullPilotId,
			idempotencyKey: `hull-scrap-${Date.now()}`,
			schematic: REINFORCED_HULL_PLATE,
			slotInputs: [
				{ slotId: 'outer_plate', resourceInstanceId: kethInstanceId },
				{ slotId: 'bracing_layer', resourceInstanceId: kethInstanceId },
				{ slotId: 'bonding_matrix', resourceInstanceId: paleInstanceId }
			],
			tuning: { max_condition: 1, damage_reduction: 1, repairability: 1 },
			craftMode: 'careful_experiment',
			experimentSeed: scrapSeed,
			experimentPulses: [
				{ propertyId: 'max_condition', push: 'overdrive' },
				{ propertyId: 'damage_reduction', push: 'careful' }
			]
		});

		expect(result.status).toBe('crafted');
		if (result.status !== 'crafted') {
			return;
		}

		const afterKeth = await getResourceStackForPilotInstance(db, hullPilotId, kethInstanceId);
		expect(afterKeth?.quantity).toBe(0);

		const craftedLedger = (await listEconomyLedgerEntriesForPilot(db, hullPilotId)).find(
			(entry) => entry.eventType === 'item_crafted'
		);
		const craftedPayload = craftedLedger?.payload as Record<string, unknown> | null;
		expect(craftedPayload?.experiment_scrap_units).toBe(scrapUnits);

		const kethConsumes = (await listEconomyLedgerEntriesForPilot(db, hullPilotId)).filter(
			(entry) =>
				entry.eventType === 'resource_consumed' &&
				entry.resourceInstanceId === kethInstanceId
		);
		expect(kethConsumes).toHaveLength(3);
		expect(
			kethConsumes.reduce((sum, entry) => sum + -(entry.quantityDelta ?? 0), 0)
		).toBe(160);

		await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, hullPilotId));
		await db.delete(items).where(eq(items.pilotId, hullPilotId));
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, hullPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, hullPilotId));
		await db.delete(pilots).where(eq(pilots.id, hullPilotId));
	});
});
