import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	BASIC_DRILL_HEAD,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I,
	WORKSHOP_CRATE_UNITS_PER_FAMILY,
	WORKSHOP_STARTER_GRANT_UNITS,
	WORKSHOP_TIMER_CRATE_MINUTES
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { craftingAttempts } from '../schema/craftingAttempts.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilotWorkshopState } from '../schema/pilotWorkshopState.js';
import { pilots } from '../schema/pilots.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { workshopCrates } from '../schema/workshopCrates.js';
import { workshopReclaims } from '../schema/workshopReclaims.js';
import { craftSchematicForPilot } from './crafting.js';
import { listEconomyLedgerEntriesForPilot } from './economyLedger.js';
import { grantResourceToPilot, getResourceStackForPilotInstance } from './resourceGrants.js';
import {
	createWorkshopCrateTx,
	isTimedWorkshopCrateDue,
	listWorkshopCratesForPilot,
	openWorkshopCrateForPilot,
	recordWorkshopCraftCompletionTx,
	refreshTimedWorkshopCratesTx,
	syncWorkshopSupplyCratesForPilot
} from './workshopCrates.js';
import { reclaimWorkshopItemForPilot, WorkshopReclaimValidationError } from './workshopReclaims.js';
import {
	assertWorkshopBenchCraftInputs,
	isWorkshopBenchResourceInstance,
	listPilotWorkshopBenchStacksWithInstances,
	WorkshopBenchResourceValidationError
} from './workshopBenchInventory.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import {
	ensureWorkshopBenchResourceInstances,
	ensureWorkshopStarterGrantForPilot,
	getPilotWorkshopState,
	getWorkshopBenchInstanceBySlug,
	ensurePilotWorkshopStateTx,
	setItemFavoriteForPilot,
	WorkshopSliceItemValidationError
} from './workshopSlice.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

async function cleanupPilot(db: ReturnType<typeof createDb>, pilotId: string) {
	await db.delete(workshopReclaims).where(eq(workshopReclaims.pilotId, pilotId));
	await db.delete(workshopCrates).where(eq(workshopCrates.pilotId, pilotId));
	await db.delete(pilotWorkshopState).where(eq(pilotWorkshopState.pilotId, pilotId));
	await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, pilotId));
	await db.delete(items).where(eq(items.pilotId, pilotId));
	await db.delete(economyLedger).where(eq(economyLedger.pilotId, pilotId));
	await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, pilotId));
	await db.delete(pilots).where(eq(pilots.id, pilotId));
}

describeDb('workshop slice persistence', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `workshop-slice-${Date.now()}`;

	let kethBenchId = '';
	let sorrelBenchId = '';
	let paleBenchId = '';

	beforeAll(async () => {
		await ensureWorkshopBenchResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();

		kethBenchId = (await getWorkshopBenchInstanceBySlug(db, 'keth_iron')).id;
		sorrelBenchId = (await getWorkshopBenchInstanceBySlug(db, 'sorrel_vein_copper')).id;
		paleBenchId = (await getWorkshopBenchInstanceBySlug(db, 'pale_ember_crystal')).id;
	});

	afterAll(async () => {
		await cleanupPilot(db, testPilotId);
	});

	it('starter grant is idempotent per pilot', async () => {
		const first = await ensureWorkshopStarterGrantForPilot(db, testPilotId);
		const second = await ensureWorkshopStarterGrantForPilot(db, testPilotId);

		expect(first.status).toBe('granted');
		expect(second.status).toBe('already_granted');

		const kethStack = await getResourceStackForPilotInstance(db, testPilotId, kethBenchId);
		expect(kethStack?.quantity).toBe(WORKSHOP_STARTER_GRANT_UNITS);

		const state = await getPilotWorkshopState(db, testPilotId);
		expect(state?.starterGrantedAt).not.toBeNull();
	});

	it('favorite and unfavorite persist on items', async () => {
		const [item] = await db
			.insert(items)
			.values({
				pilotId: testPilotId,
				schematicId: BASIC_DRILL_HEAD.id,
				schematicVersion: BASIC_DRILL_HEAD.version,
				displayName: BASIC_DRILL_HEAD.displayName,
				propertyScores: { extraction_rate: 50 },
				provenance: []
			})
			.returning();

		const favorited = await setItemFavoriteForPilot(db, {
			pilotId: testPilotId,
			itemId: item!.id,
			favorited: true
		});
		expect(favorited.favoritedAt).not.toBeNull();

		const unfavorited = await setItemFavoriteForPilot(db, {
			pilotId: testPilotId,
			itemId: item!.id,
			favorited: false
		});
		expect(unfavorited.favoritedAt).toBeNull();
	});

	it('reclaim returns expected resources, writes ledger rows, and rejects double reclaim', async () => {
		const reclaimPilotId = `${testPilotId}-reclaim`;
		await db.insert(pilots).values({ id: reclaimPilotId }).onConflictDoNothing();
		await grantResourceToPilot(db, {
			pilotId: reclaimPilotId,
			resourceInstanceId: kethBenchId,
			quantity: 40,
			source: { type: 'test_grant', id: 'reclaim-setup' }
		});
		await grantResourceToPilot(db, {
			pilotId: reclaimPilotId,
			resourceInstanceId: sorrelBenchId,
			quantity: 40,
			source: { type: 'test_grant', id: 'reclaim-setup' }
		});
		await grantResourceToPilot(db, {
			pilotId: reclaimPilotId,
			resourceInstanceId: paleBenchId,
			quantity: 40,
			source: { type: 'test_grant', id: 'reclaim-setup' }
		});

		const [item] = await db
			.insert(items)
			.values({
				pilotId: reclaimPilotId,
				schematicId: BASIC_DRILL_HEAD.id,
				schematicVersion: BASIC_DRILL_HEAD.version,
				displayName: BASIC_DRILL_HEAD.displayName,
				propertyScores: { extraction_rate: 50 },
				provenance: [
					{
						slotId: 'cutting_bit',
						slotDisplayName: 'Cutting Bit',
						resourceInstanceId: kethBenchId,
						resourceSlug: 'keth_iron',
						resourceDisplayName: 'Keth Iron (Bench)',
						family: 'structural_alloy',
						quantityConsumed: 40
					},
					{
						slotId: 'conductive_coil',
						slotDisplayName: 'Conductive Coil',
						resourceInstanceId: sorrelBenchId,
						resourceSlug: 'sorrel_vein_copper',
						resourceDisplayName: 'Sorrel Vein Copper (Bench)',
						family: 'conductive_metal',
						quantityConsumed: 40
					},
					{
						slotId: 'resonance_crystal',
						slotDisplayName: 'Resonance Crystal',
						resourceInstanceId: paleBenchId,
						resourceSlug: 'pale_ember_crystal',
						resourceDisplayName: 'Pale Ember Crystal (Bench)',
						family: 'reactive_crystal',
						quantityConsumed: 40
					}
				]
			})
			.returning();

		const beforeKeth = await getResourceStackForPilotInstance(db, reclaimPilotId, kethBenchId);
		const reclaimed = await reclaimWorkshopItemForPilot(db, {
			pilotId: reclaimPilotId,
			itemId: item!.id,
			idempotencyKey: `reclaim-${Date.now()}`
		});

		expect(reclaimed.status).toBe('reclaimed');
		expect(reclaimed.returnedResources).toEqual([
			{ resourceSlug: 'keth_iron', resourceInstanceId: kethBenchId, quantity: 10 },
			{ resourceSlug: 'sorrel_vein_copper', resourceInstanceId: sorrelBenchId, quantity: 10 },
			{ resourceSlug: 'pale_ember_crystal', resourceInstanceId: paleBenchId, quantity: 10 }
		]);

		const afterKeth = await getResourceStackForPilotInstance(db, reclaimPilotId, kethBenchId);
		expect(afterKeth?.quantity).toBe((beforeKeth?.quantity ?? 0) + 10);

		const ledger = await listEconomyLedgerEntriesForPilot(db, reclaimPilotId);
		expect(
			ledger.some(
				(entry) =>
					entry.eventType === 'resource_granted' &&
					(entry.payload as { source_type?: string }).source_type === 'workshop_item_reclaimed'
			)
		).toBe(true);

		await expect(
			reclaimWorkshopItemForPilot(db, {
				pilotId: reclaimPilotId,
				itemId: item!.id,
				idempotencyKey: `reclaim-${Date.now()}-other`
			})
		).rejects.toBeInstanceOf(WorkshopReclaimValidationError);

		await cleanupPilot(db, reclaimPilotId);
	});

	it('rejects reclaiming favorited items without explicit confirmation', async () => {
		const favoritePilotId = `${testPilotId}-favorite-reclaim`;
		await db.insert(pilots).values({ id: favoritePilotId }).onConflictDoNothing();

		const [item] = await db
			.insert(items)
			.values({
				pilotId: favoritePilotId,
				schematicId: BASIC_DRILL_HEAD.id,
				schematicVersion: BASIC_DRILL_HEAD.version,
				displayName: BASIC_DRILL_HEAD.displayName,
				propertyScores: { extraction_rate: 50 },
				provenance: [
					{
						slotId: 'cutting_bit',
						slotDisplayName: 'Cutting Bit',
						resourceInstanceId: kethBenchId,
						resourceSlug: 'keth_iron',
						resourceDisplayName: 'Keth Iron (Bench)',
						family: 'structural_alloy',
						quantityConsumed: 40
					}
				],
				favoritedAt: new Date()
			})
			.returning();

		await expect(
			reclaimWorkshopItemForPilot(db, {
				pilotId: favoritePilotId,
				itemId: item!.id,
				idempotencyKey: `favorite-reclaim-${Date.now()}`
			})
		).rejects.toBeInstanceOf(WorkshopReclaimValidationError);

		await cleanupPilot(db, favoritePilotId);
	});

	it('rejects forged reclaim of non-workshop items and leaves stacks unchanged', async () => {
		const forgedPilotId = `${testPilotId}-forged-reclaim`;
		await db.insert(pilots).values({ id: forgedPilotId }).onConflictDoNothing();
		await ensureBloomOneResourceInstances(db);

		const liveKeth = (await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron'))!;
		await grantResourceToPilot(db, {
			pilotId: forgedPilotId,
			resourceInstanceId: liveKeth.id,
			quantity: 40,
			source: { type: 'test_grant', id: 'forged-reclaim-setup' }
		});

		const beforeLive = await getResourceStackForPilotInstance(db, forgedPilotId, liveKeth.id);

		const [scannerItem] = await db
			.insert(items)
			.values({
				pilotId: forgedPilotId,
				schematicId: SURVEY_SCANNER_MK_I.id,
				schematicVersion: SURVEY_SCANNER_MK_I.version,
				displayName: SURVEY_SCANNER_MK_I.displayName,
				propertyScores: { survey_clarity: 50 },
				provenance: [
					{
						slotId: 'frame_mount',
						slotDisplayName: 'Frame Mount',
						resourceInstanceId: liveKeth.id,
						resourceSlug: 'keth_iron',
						resourceDisplayName: 'Keth Iron',
						family: 'structural_alloy',
						quantityConsumed: 40
					}
				]
			})
			.returning();

		await expect(
			reclaimWorkshopItemForPilot(db, {
				pilotId: forgedPilotId,
				itemId: scannerItem!.id,
				idempotencyKey: `forged-reclaim-${Date.now()}`
			})
		).rejects.toBeInstanceOf(WorkshopSliceItemValidationError);

		const afterLive = await getResourceStackForPilotInstance(db, forgedPilotId, liveKeth.id);
		expect(afterLive?.quantity).toBe(beforeLive?.quantity);

		await cleanupPilot(db, forgedPilotId);
	});

	it('rejects favorite on non-workshop items', async () => {
		const forgedPilotId = `${testPilotId}-forged-favorite`;
		await db.insert(pilots).values({ id: forgedPilotId }).onConflictDoNothing();

		const [scannerItem] = await db
			.insert(items)
			.values({
				pilotId: forgedPilotId,
				schematicId: SURVEY_SCANNER_MK_I.id,
				schematicVersion: SURVEY_SCANNER_MK_I.version,
				displayName: SURVEY_SCANNER_MK_I.displayName,
				propertyScores: { survey_clarity: 50 },
				provenance: []
			})
			.returning();

		await expect(
			setItemFavoriteForPilot(db, {
				pilotId: forgedPilotId,
				itemId: scannerItem!.id,
				favorited: true
			})
		).rejects.toBeInstanceOf(WorkshopSliceItemValidationError);

		await cleanupPilot(db, forgedPilotId);
	});

	it('aggregates duplicate provenance instances when reclaiming hull materials', async () => {
		const hullPilotId = `${testPilotId}-hull-reclaim`;
		await db.insert(pilots).values({ id: hullPilotId }).onConflictDoNothing();

		const beforeKeth = await getResourceStackForPilotInstance(db, hullPilotId, kethBenchId);

		const [item] = await db
			.insert(items)
			.values({
				pilotId: hullPilotId,
				schematicId: REINFORCED_HULL_PLATE.id,
				schematicVersion: REINFORCED_HULL_PLATE.version,
				displayName: REINFORCED_HULL_PLATE.displayName,
				propertyScores: { max_condition: 50 },
				provenance: [
					{
						slotId: 'outer_plate',
						slotDisplayName: 'Outer Plate',
						resourceInstanceId: kethBenchId,
						resourceSlug: 'keth_iron',
						resourceDisplayName: 'Keth Iron (Bench)',
						family: 'structural_alloy',
						quantityConsumed: 60
					},
					{
						slotId: 'bracing_layer',
						slotDisplayName: 'Bracing Layer',
						resourceInstanceId: kethBenchId,
						resourceSlug: 'keth_iron',
						resourceDisplayName: 'Keth Iron (Bench)',
						family: 'structural_alloy',
						quantityConsumed: 40
					},
					{
						slotId: 'bonding_matrix',
						slotDisplayName: 'Bonding Matrix',
						resourceInstanceId: paleBenchId,
						resourceSlug: 'pale_ember_crystal',
						resourceDisplayName: 'Pale Ember Crystal (Bench)',
						family: 'reactive_crystal',
						quantityConsumed: 20
					}
				]
			})
			.returning();

		const reclaimed = await reclaimWorkshopItemForPilot(db, {
			pilotId: hullPilotId,
			itemId: item!.id,
			idempotencyKey: `hull-reclaim-${Date.now()}`
		});

		expect(reclaimed.returnedResources).toEqual([
			{ resourceSlug: 'keth_iron', resourceInstanceId: kethBenchId, quantity: 35 },
			{ resourceSlug: 'pale_ember_crystal', resourceInstanceId: paleBenchId, quantity: 5 }
		]);

		const afterKeth = await getResourceStackForPilotInstance(db, hullPilotId, kethBenchId);
		expect(afterKeth?.quantity).toBe((beforeKeth?.quantity ?? 0) + 35);

		await cleanupPilot(db, hullPilotId);
	});

	it('timer crate availability is DB-derived and opening grants resources with ledger coverage', async () => {
		const cratePilotId = `${testPilotId}-crate`;
		await db.insert(pilots).values({ id: cratePilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, cratePilotId);

		const dueAt = new Date(Date.now() - 60_000);
		await db
			.update(pilotWorkshopState)
			.set({ nextTimedCrateAt: dueAt, updatedAt: new Date() })
			.where(eq(pilotWorkshopState.pilotId, cratePilotId));

		expect(await isTimedWorkshopCrateDue(db, cratePilotId, new Date())).toBe(true);

		const timerCrate = await db.transaction((tx) =>
			refreshTimedWorkshopCratesTx(tx, cratePilotId, new Date())
		);
		expect(timerCrate?.reason).toBe('timer');

		const beforeStacks = await db
			.select()
			.from(resourceStacks)
			.where(eq(resourceStacks.pilotId, cratePilotId));

		const opened = await openWorkshopCrateForPilot(db, {
			pilotId: cratePilotId,
			crateId: timerCrate!.id,
			idempotencyKey: `open-crate-${Date.now()}`
		});
		expect(opened.status).toBe('opened');

		const afterStacks = await db
			.select()
			.from(resourceStacks)
			.where(eq(resourceStacks.pilotId, cratePilotId));

		const beforeTotal = beforeStacks.reduce((sum, row) => sum + row.quantity, 0);
		const afterTotal = afterStacks.reduce((sum, row) => sum + row.quantity, 0);
		expect(afterTotal).toBe(beforeTotal + WORKSHOP_CRATE_UNITS_PER_FAMILY * 3);
		expect(afterStacks.every((row) => row.quantity >= 0)).toBe(true);

		const ledger = await listEconomyLedgerEntriesForPilot(db, cratePilotId);
		expect(
			ledger.some(
				(entry) =>
					entry.eventType === 'resource_granted' &&
					(entry.payload as { source_type?: string }).source_type === 'workshop_crate_opened'
			)
		).toBe(true);

		const replay = await openWorkshopCrateForPilot(db, {
			pilotId: cratePilotId,
			crateId: timerCrate!.id,
			idempotencyKey: `open-crate-replay-${Date.now()}`
		});
		expect(replay.status).toBe('already_opened');

		await cleanupPilot(db, cratePilotId);
	});

	it('increments craft-count crate availability after completed workshop crafts', async () => {
		const craftPilotId = `${testPilotId}-craft-count`;
		await db.insert(pilots).values({ id: craftPilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, craftPilotId);

		const slotInputs = [
			{ slotId: 'cutting_bit', resourceInstanceId: kethBenchId },
			{ slotId: 'conductive_coil', resourceInstanceId: sorrelBenchId },
			{ slotId: 'resonance_crystal', resourceInstanceId: paleBenchId }
		];

		for (let index = 0; index < 4; index += 1) {
			const result = await craftSchematicForPilot(db, {
				pilotId: craftPilotId,
				idempotencyKey: `workshop-craft-${index}-${Date.now()}`,
				schematic: BASIC_DRILL_HEAD,
				slotInputs,
				tuning: { extraction_rate: 1, depth_access: 1, wear_control: 1 },
				craftMode: 'safe_craft'
			});
			expect(result.status).toBe('crafted');
		}

		const crates = await listWorkshopCratesForPilot(db, craftPilotId, 'available');
		expect(crates.some((crate) => crate.reason === 'craft_count')).toBe(true);

		const state = await getPilotWorkshopState(db, craftPilotId);
		expect(state?.craftCountSinceCrate).toBe(0);

		await cleanupPilot(db, craftPilotId);
	});

	it('timer sync mints at most one crate per pass even when multiple intervals are overdue', async () => {
		const catchUpPilotId = `${testPilotId}-timer-catchup`;
		await db.insert(pilots).values({ id: catchUpPilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, catchUpPilotId);

		const overdueMinutes = WORKSHOP_TIMER_CRATE_MINUTES * 3 + 5;
		const dueAt = new Date(Date.now() - overdueMinutes * 60_000);
		await db
			.update(pilotWorkshopState)
			.set({ nextTimedCrateAt: dueAt, updatedAt: new Date() })
			.where(eq(pilotWorkshopState.pilotId, catchUpPilotId));

		await syncWorkshopSupplyCratesForPilot(db, catchUpPilotId);

		const timerCrates = (await listWorkshopCratesForPilot(db, catchUpPilotId)).filter(
			(crate) => crate.reason === 'timer'
		);
		expect(timerCrates).toHaveLength(1);

		const state = await getPilotWorkshopState(db, catchUpPilotId);
		expect(state?.nextTimedCrateAt!.getTime()).toBeGreaterThan(Date.now());

		await cleanupPilot(db, catchUpPilotId);
	});

	it('timer sync does not stack unopened timer crates while intervals elapse', async () => {
		const afkPilotId = `${testPilotId}-timer-afk`;
		await db.insert(pilots).values({ id: afkPilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, afkPilotId);

		const dueAt = new Date(Date.now() - WORKSHOP_TIMER_CRATE_MINUTES * 60_000);
		await db
			.update(pilotWorkshopState)
			.set({ nextTimedCrateAt: dueAt, updatedAt: new Date() })
			.where(eq(pilotWorkshopState.pilotId, afkPilotId));

		await syncWorkshopSupplyCratesForPilot(db, afkPilotId);
		await syncWorkshopSupplyCratesForPilot(db, afkPilotId);
		await syncWorkshopSupplyCratesForPilot(db, afkPilotId);

		const timerCrates = (await listWorkshopCratesForPilot(db, afkPilotId, 'available')).filter(
			(crate) => crate.reason === 'timer'
		);
		expect(timerCrates).toHaveLength(1);

		const state = await getPilotWorkshopState(db, afkPilotId);
		expect(state?.nextTimedCrateAt!.getTime()).toBeGreaterThan(Date.now());

		await cleanupPilot(db, afkPilotId);
	});

	it('concurrent timer sync does not duplicate catch-up crates', async () => {
		const timerRacePilotId = `${testPilotId}-timer-race`;
		await db.insert(pilots).values({ id: timerRacePilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, timerRacePilotId);

		const now = new Date();
		const dueAt = new Date(now.getTime() - 1_000);
		await db
			.update(pilotWorkshopState)
			.set({ nextTimedCrateAt: dueAt, updatedAt: now })
			.where(eq(pilotWorkshopState.pilotId, timerRacePilotId));

		await Promise.all([
			syncWorkshopSupplyCratesForPilot(db, timerRacePilotId, now),
			syncWorkshopSupplyCratesForPilot(db, timerRacePilotId, now)
		]);

		const timerCrates = (await listWorkshopCratesForPilot(db, timerRacePilotId)).filter(
			(crate) => crate.reason === 'timer'
		);
		expect(timerCrates).toHaveLength(1);

		await cleanupPilot(db, timerRacePilotId);
	});

	it('concurrent craft completions mint only one craft-count crate', async () => {
		const craftRacePilotId = `${testPilotId}-craft-race`;
		await db.insert(pilots).values({ id: craftRacePilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, craftRacePilotId);
		await db
			.update(pilotWorkshopState)
			.set({ craftCountSinceCrate: 3, updatedAt: new Date() })
			.where(eq(pilotWorkshopState.pilotId, craftRacePilotId));

		await Promise.all([
			db.transaction((tx) => recordWorkshopCraftCompletionTx(tx, craftRacePilotId)),
			db.transaction((tx) => recordWorkshopCraftCompletionTx(tx, craftRacePilotId))
		]);

		const craftCrates = (await listWorkshopCratesForPilot(db, craftRacePilotId)).filter(
			(crate) => crate.reason === 'craft_count'
		);
		expect(craftCrates).toHaveLength(1);

		const state = await getPilotWorkshopState(db, craftRacePilotId);
		expect(state?.craftCountSinceCrate).toBe(1);

		await cleanupPilot(db, craftRacePilotId);
	});

	it('concurrent crate opens grant resources exactly once', async () => {
		const openRacePilotId = `${testPilotId}-open-race`;
		await db.insert(pilots).values({ id: openRacePilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, openRacePilotId);

		const crate = await db.transaction((tx) =>
			createWorkshopCrateTx(tx, { pilotId: openRacePilotId, reason: 'emergency' })
		);

		const beforeStacks = await db
			.select()
			.from(resourceStacks)
			.where(eq(resourceStacks.pilotId, openRacePilotId));
		const beforeTotal = beforeStacks.reduce((sum, row) => sum + row.quantity, 0);

		const [first, second] = await Promise.all([
			openWorkshopCrateForPilot(db, {
				pilotId: openRacePilotId,
				crateId: crate.id,
				idempotencyKey: `open-race-a-${Date.now()}`
			}),
			openWorkshopCrateForPilot(db, {
				pilotId: openRacePilotId,
				crateId: crate.id,
				idempotencyKey: `open-race-b-${Date.now()}`
			})
		]);

		const openedCount = [first, second].filter((result) => result.status === 'opened').length;
		const alreadyCount = [first, second].filter((result) => result.status === 'already_opened').length;
		expect(openedCount).toBe(1);
		expect(alreadyCount).toBe(1);

		const afterStacks = await db
			.select()
			.from(resourceStacks)
			.where(eq(resourceStacks.pilotId, openRacePilotId));
		const afterTotal = afterStacks.reduce((sum, row) => sum + row.quantity, 0);
		expect(afterTotal).toBe(beforeTotal + WORKSHOP_CRATE_UNITS_PER_FAMILY * 3);

		await cleanupPilot(db, openRacePilotId);
	});

	it('manual crate open cannot double-grant on replay', async () => {
		const manualPilotId = `${testPilotId}-manual-crate`;
		await db.insert(pilots).values({ id: manualPilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, manualPilotId);

		const crate = await db.transaction((tx) =>
			createWorkshopCrateTx(tx, { pilotId: manualPilotId, reason: 'emergency' })
		);

		const key = `manual-open-${Date.now()}`;
		const first = await openWorkshopCrateForPilot(db, {
			pilotId: manualPilotId,
			crateId: crate.id,
			idempotencyKey: key
		});
		const second = await openWorkshopCrateForPilot(db, {
			pilotId: manualPilotId,
			crateId: crate.id,
			idempotencyKey: `${key}-replay`
		});

		expect(first.status).toBe('opened');
		expect(second.status).toBe('already_opened');

		await cleanupPilot(db, manualPilotId);
	});

	it('workshop bench inventory excludes live-bloom stacks and rejects forged craft inputs', async () => {
		const filterPilotId = `${testPilotId}-bench-filter`;
		await db.insert(pilots).values({ id: filterPilotId }).onConflictDoNothing();
		await ensureBloomOneResourceInstances(db);

		const liveKeth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
		expect(liveKeth).toBeDefined();

		await grantResourceToPilot(db, {
			pilotId: filterPilotId,
			resourceInstanceId: liveKeth!.id,
			quantity: 50,
			source: { type: 'test_grant', id: 'live-bloom-keth' }
		});
		await grantResourceToPilot(db, {
			pilotId: filterPilotId,
			resourceInstanceId: kethBenchId,
			quantity: 30,
			source: { type: 'test_grant', id: 'bench-keth' }
		});

		const benchStacks = await listPilotWorkshopBenchStacksWithInstances(db, filterPilotId);
		expect(benchStacks.some((stack) => stack.resourceInstanceId === kethBenchId)).toBe(true);
		expect(benchStacks.some((stack) => stack.resourceInstanceId === liveKeth!.id)).toBe(false);

		expect(await isWorkshopBenchResourceInstance(db, kethBenchId)).toBe(true);
		expect(await isWorkshopBenchResourceInstance(db, liveKeth!.id)).toBe(false);

		await assertWorkshopBenchCraftInputs(db, [kethBenchId]);
		await expect(assertWorkshopBenchCraftInputs(db, [liveKeth!.id])).rejects.toBeInstanceOf(
			WorkshopBenchResourceValidationError
		);

		await cleanupPilot(db, filterPilotId);
	});

	it('mints emergency crate only when no thumper part is craftable', async () => {
		const stuckPilotId = `${testPilotId}-emergency`;
		await db.insert(pilots).values({ id: stuckPilotId }).onConflictDoNothing();
		await ensurePilotWorkshopStateTx(db, stuckPilotId);

		for (const benchId of [kethBenchId, sorrelBenchId, paleBenchId]) {
			await grantResourceToPilot(db, {
				pilotId: stuckPilotId,
				resourceInstanceId: benchId,
				quantity: 10,
				source: { type: 'test_grant', id: 'emergency-stuck' }
			});
		}

		await syncWorkshopSupplyCratesForPilot(db, stuckPilotId);
		const first = await listWorkshopCratesForPilot(db, stuckPilotId, 'available');
		expect(first.filter((crate) => crate.reason === 'emergency')).toHaveLength(1);

		await syncWorkshopSupplyCratesForPilot(db, stuckPilotId);
		const second = await listWorkshopCratesForPilot(db, stuckPilotId, 'available');
		expect(second.filter((crate) => crate.reason === 'emergency')).toHaveLength(1);

		await cleanupPilot(db, stuckPilotId);
	});

	it('does not mint emergency crate when bench stock can still craft', async () => {
		const okPilotId = `${testPilotId}-emergency-skip`;
		await db.insert(pilots).values({ id: okPilotId }).onConflictDoNothing();
		await ensureWorkshopStarterGrantForPilot(db, okPilotId);

		await syncWorkshopSupplyCratesForPilot(db, okPilotId);
		const crates = await listWorkshopCratesForPilot(db, okPilotId, 'available');
		expect(crates.some((crate) => crate.reason === 'emergency')).toBe(false);

		await cleanupPilot(db, okPilotId);
	});

	it('does not mint emergency when an available timer crate already exists', async () => {
		const stuckPilotId = `${testPilotId}-emergency-has-timer`;
		await db.insert(pilots).values({ id: stuckPilotId }).onConflictDoNothing();
		await ensurePilotWorkshopStateTx(db, stuckPilotId);

		for (const benchId of [kethBenchId, sorrelBenchId, paleBenchId]) {
			await grantResourceToPilot(db, {
				pilotId: stuckPilotId,
				resourceInstanceId: benchId,
				quantity: 10,
				source: { type: 'test_grant', id: 'emergency-has-timer' }
			});
		}

		await createWorkshopCrateTx(db, { pilotId: stuckPilotId, reason: 'timer' });
		await syncWorkshopSupplyCratesForPilot(db, stuckPilotId);

		const crates = await listWorkshopCratesForPilot(db, stuckPilotId, 'available');
		expect(crates.some((crate) => crate.reason === 'timer')).toBe(true);
		expect(crates.some((crate) => crate.reason === 'emergency')).toBe(false);

		await cleanupPilot(db, stuckPilotId);
	});

	it('does not mint emergency when timer catch-up mints a crate in the same sync pass', async () => {
		const stuckPilotId = `${testPilotId}-emergency-timer-catchup`;
		await db.insert(pilots).values({ id: stuckPilotId }).onConflictDoNothing();

		const dueAt = new Date(Date.now() - WORKSHOP_TIMER_CRATE_MINUTES * 60_000);
		await ensurePilotWorkshopStateTx(db, stuckPilotId, dueAt);
		await db
			.update(pilotWorkshopState)
			.set({ nextTimedCrateAt: dueAt, updatedAt: dueAt })
			.where(eq(pilotWorkshopState.pilotId, stuckPilotId));

		for (const benchId of [kethBenchId, sorrelBenchId, paleBenchId]) {
			await grantResourceToPilot(db, {
				pilotId: stuckPilotId,
				resourceInstanceId: benchId,
				quantity: 10,
				source: { type: 'test_grant', id: 'emergency-timer-catchup' }
			});
		}

		await syncWorkshopSupplyCratesForPilot(db, stuckPilotId);

		const crates = await listWorkshopCratesForPilot(db, stuckPilotId, 'available');
		expect(crates.some((crate) => crate.reason === 'timer')).toBe(true);
		expect(crates.some((crate) => crate.reason === 'emergency')).toBe(false);

		await cleanupPilot(db, stuckPilotId);
	});
});
