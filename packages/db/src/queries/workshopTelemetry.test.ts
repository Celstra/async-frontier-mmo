import {
	BASIC_DRILL_HEAD,
	EFFICIENT_PUMP,
	REINFORCED_HULL_PLATE,
	WORKSHOP_ACTIVE_SCHEMATIC_IDS
} from '@async-frontier-mmo/domain';
import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../client.js';
import { craftingAttempts } from '../schema/craftingAttempts.js';
import { pilots } from '../schema/pilots.js';
import { playtestEvents } from '../schema/playtestEvents.js';
import {
	countPlaytestEventsByName,
	listPlaytestEventsForPilot,
	recordPlaytestEvent,
	recordPlaytestEventOnce
} from './playtestTelemetry.js';
import {
	countCompletedCraftsForSchematic,
	hasAnyCompletedWorkshopCraft,
	hasCraftedEachWorkshopThumperPart,
	listCompletedWorkshopSchematicIdsForPilot
} from './workshopTelemetry.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('workshop telemetry helpers', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-30-workshop-telemetry-${Date.now()}`;

	afterAll(async () => {
		await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, testPilotId));
		await db.delete(playtestEvents).where(eq(playtestEvents.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	async function seedPilot() {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
	}

	async function insertCompletedCraft(schematicId: string, key: string) {
		await db.insert(craftingAttempts).values({
			pilotId: testPilotId,
			idempotencyKey: key,
			schematicId,
			schematicVersion: 1,
			craftMode: 'safe_craft',
			tuning: {},
			slotSelections: [],
			preview: {},
			resultExplanation: {},
			status: 'completed'
		});
	}

	it('tracks completed workshop schematics and thumper-part milestone', async () => {
		await seedPilot();

		expect(await hasCraftedEachWorkshopThumperPart(db, testPilotId)).toBe(false);

		await insertCompletedCraft(BASIC_DRILL_HEAD.id, 'craft-1');
		await insertCompletedCraft(EFFICIENT_PUMP.id, 'craft-2');

		expect(await listCompletedWorkshopSchematicIdsForPilot(db, testPilotId)).toEqual(
			expect.arrayContaining([BASIC_DRILL_HEAD.id, EFFICIENT_PUMP.id])
		);
		expect(await hasCraftedEachWorkshopThumperPart(db, testPilotId)).toBe(false);

		await insertCompletedCraft(REINFORCED_HULL_PLATE.id, 'craft-3');
		expect(await hasCraftedEachWorkshopThumperPart(db, testPilotId)).toBe(true);
		expect(await listCompletedWorkshopSchematicIdsForPilot(db, testPilotId)).toHaveLength(
			WORKSHOP_ACTIVE_SCHEMATIC_IDS.length
		);
	});

	it('keeps workshop crate unlock after completed crafts even with no active prototypes', async () => {
		const unlockPilotId = `${testPilotId}-unlock`;
		await db.insert(pilots).values({ id: unlockPilotId }).onConflictDoNothing();
		expect(await hasAnyCompletedWorkshopCraft(db, unlockPilotId)).toBe(false);

		await db.insert(craftingAttempts).values({
			pilotId: unlockPilotId,
			idempotencyKey: 'unlock-craft',
			schematicId: REINFORCED_HULL_PLATE.id,
			schematicVersion: 1,
			craftMode: 'safe_craft',
			tuning: {},
			slotSelections: [],
			preview: {},
			resultExplanation: {},
			status: 'completed'
		});
		expect(await hasAnyCompletedWorkshopCraft(db, unlockPilotId)).toBe(true);

		await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, unlockPilotId));
		await db.delete(pilots).where(eq(pilots.id, unlockPilotId));
	});

	it('counts repeat crafts for the same schematic', async () => {
		const repeatPilotId = `${testPilotId}-repeat`;
		await db.insert(pilots).values({ id: repeatPilotId }).onConflictDoNothing();
		await db.insert(craftingAttempts).values({
			pilotId: repeatPilotId,
			idempotencyKey: 'repeat-1',
			schematicId: BASIC_DRILL_HEAD.id,
			schematicVersion: 1,
			craftMode: 'safe_craft',
			tuning: {},
			slotSelections: [],
			preview: {},
			resultExplanation: {},
			status: 'completed'
		});
		await db.insert(craftingAttempts).values({
			pilotId: repeatPilotId,
			idempotencyKey: 'repeat-2',
			schematicId: BASIC_DRILL_HEAD.id,
			schematicVersion: 1,
			craftMode: 'safe_craft',
			tuning: {},
			slotSelections: [],
			preview: {},
			resultExplanation: {},
			status: 'completed'
		});

		expect(await countCompletedCraftsForSchematic(db, repeatPilotId, BASIC_DRILL_HEAD.id)).toBe(2);

		await db.delete(craftingAttempts).where(eq(craftingAttempts.pilotId, repeatPilotId));
		await db.delete(pilots).where(eq(pilots.id, repeatPilotId));
	});

	it('records once workshop events only once', async () => {
		await seedPilot();

		const first = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'workshop_started'
		});
		const second = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'workshop_started'
		});

		expect(first).toBe(true);
		expect(second).toBe(false);
		expect(await countPlaytestEventsByName(db, testPilotId, 'workshop_started')).toBe(1);
	});

	it('records crafted_each_thumper_part once after all three schematics', async () => {
		await seedPilot();
		for (const [index, schematicId] of WORKSHOP_ACTIVE_SCHEMATIC_IDS.entries()) {
			await insertCompletedCraft(schematicId, `all-parts-${index}`);
		}

		expect(await hasCraftedEachWorkshopThumperPart(db, testPilotId)).toBe(true);

		const first = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'crafted_each_thumper_part',
			payload: {
				schematicIds: await listCompletedWorkshopSchematicIdsForPilot(db, testPilotId)
			}
		});
		const second = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'crafted_each_thumper_part',
			payload: {
				schematicIds: await listCompletedWorkshopSchematicIdsForPilot(db, testPilotId)
			}
		});

		expect(first).toBe(true);
		expect(second).toBe(false);
	});

	it('allows repeat craft_completed events with pulse outcomes', async () => {
		await seedPilot();

		const pulsePayload = {
			itemId: 'item-1',
			schematicId: BASIC_DRILL_HEAD.id,
			craftMode: 'careful_experiment',
			propertyScores: { extraction_rate: 72 },
			pulseOutcomes: [
				{ pulseIndex: 0, propertyId: 'extraction_rate', push: 'careful', outcome: 'success', scrapUnits: 0 }
			],
			scrapUnits: 0,
			hasMinorFlaw: false
		};

		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'craft_completed',
			payload: pulsePayload
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'craft_completed',
			payload: { ...pulsePayload, itemId: 'item-2' }
		});

		const events = await listPlaytestEventsForPilot(db, testPilotId);
		const completed = events.filter((event) => event.eventName === 'craft_completed');
		expect(completed).toHaveLength(2);
		expect(completed[0]?.payload).toMatchObject({
			pulseOutcomes: expect.arrayContaining([
				expect.objectContaining({ outcome: 'success', push: 'careful' })
			])
		});
	});

	it('records starter_resources_viewed with per-stack resource evidence', async () => {
		await seedPilot();

		await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'starter_resources_viewed',
			payload: {
				stackCount: 2,
				totalUnits: 15,
				stacks: [
					{
						resourceInstanceId: 'bench-keth',
						resourceSlug: 'keth_bench',
						family: 'conductive_metal',
						quantity: 10,
						stats: { OQ: 42, conductivity: 38 }
					},
					{
						resourceInstanceId: 'bench-sorrel',
						resourceSlug: 'sorrel_bench',
						family: 'structural_alloy',
						quantity: 5,
						stats: { OQ: 40, hardness: 36 }
					}
				]
			}
		});

		const events = await listPlaytestEventsForPilot(db, testPilotId);
		const viewed = events.find((event) => event.eventName === 'starter_resources_viewed');
		expect(viewed?.payload).toMatchObject({
			stackCount: 2,
			totalUnits: 15,
			stacks: expect.arrayContaining([
				expect.objectContaining({
					resourceInstanceId: 'bench-keth',
					resourceSlug: 'keth_bench',
					quantity: 10
				})
			])
		});
	});

	it('records reclaim and crate payloads with economy fields', async () => {
		await seedPilot();

		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'item_reclaimed',
			payload: {
				itemId: 'item-abc',
				returnedResources: [{ resourceSlug: 'keth_bench', quantity: 3 }]
			}
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'supply_crate_opened',
			payload: {
				crateId: 'crate-1',
				reason: 'timer',
				payload: [{ resourceSlug: 'sorrel_bench', quantity: 5 }]
			}
		});

		const events = await listPlaytestEventsForPilot(db, testPilotId);
		const reclaimed = events.find((event) => event.eventName === 'item_reclaimed');
		const opened = events.find((event) => event.eventName === 'supply_crate_opened');

		expect(reclaimed?.payload).toMatchObject({
			returnedResources: [{ resourceSlug: 'keth_bench', quantity: 3 }]
		});
		expect(opened?.payload).toMatchObject({
			reason: 'timer',
			payload: [{ resourceSlug: 'sorrel_bench', quantity: 5 }]
		});
	});

	it('records HZD workshop-first comprehension events', async () => {
		await seedPilot();

		const missionFirst = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'mission_panel_seen'
		});
		const missionSecond = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'mission_panel_seen'
		});
		expect(missionFirst).toBe(true);
		expect(missionSecond).toBe(false);

		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'first_socket_cta_clicked',
			payload: { schematicId: BASIC_DRILL_HEAD.id, slotId: 'cutting_bit' }
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'slot_hint_seen',
			payload: { schematicId: BASIC_DRILL_HEAD.id, slotId: 'cutting_bit' }
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'safe_to_experiment_nudge_seen',
			payload: { schematicId: BASIC_DRILL_HEAD.id, itemId: 'item-safe-1' }
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'experiment_after_safe_craft',
			payload: { schematicId: BASIC_DRILL_HEAD.id, itemId: 'item-safe-1' }
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'crate_panel_opened_before_first_craft',
			payload: { crateId: 'crate-early' }
		});

		const events = await listPlaytestEventsForPilot(db, testPilotId);
		expect(events.filter((event) => event.eventName === 'first_socket_cta_clicked')).toHaveLength(1);
		expect(
			events.filter((event) => event.eventName === 'crate_panel_opened_before_first_craft')
		).toHaveLength(1);
	});
});
