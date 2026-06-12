import { eq } from 'drizzle-orm';
import { afterAll, describe, expect, it } from 'vitest';
import { createDb } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { playtestEvents } from '../schema/playtestEvents.js';
import {
	countPlaytestEventsByName,
	listPlaytestEventsForPilot,
	recordPlaytestEvent,
	recordPlaytestEventOnce
} from './playtestTelemetry.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('playtest telemetry', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-29-telemetry-${Date.now()}`;

	afterAll(async () => {
		await db.delete(playtestEvents).where(eq(playtestEvents.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('records funnel events once per pilot when using recordPlaytestEventOnce', async () => {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();

		const first = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'prologue_done'
		});
		const second = await recordPlaytestEventOnce(db, {
			pilotId: testPilotId,
			eventName: 'prologue_done'
		});

		expect(first).toBe(true);
		expect(second).toBe(false);

		const events = await listPlaytestEventsForPilot(db, testPilotId);
		expect(events.filter((event) => event.eventName === 'prologue_done')).toHaveLength(1);
	});

	it('counts repeated events by name for scan-action sequencing', async () => {
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'first_survey_started',
			payload: { family: 'conductive_metal', scanAction: 1 }
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'first_survey_started',
			payload: { family: 'conductive_metal', scanAction: 2 }
		});

		expect(await countPlaytestEventsByName(db, testPilotId, 'first_survey_started')).toBe(2);
	});

	it('allows comprehension signals to repeat', async () => {
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'resource_stats_inspected',
			payload: { resourceSlug: 'veyrith_copper' }
		});
		await recordPlaytestEvent(db, {
			pilotId: testPilotId,
			eventName: 'resource_stats_inspected',
			payload: { resourceSlug: 'slag_iron' }
		});

		const events = await listPlaytestEventsForPilot(db, testPilotId);
		expect(
			events.filter((event) => event.eventName === 'resource_stats_inspected')
		).toHaveLength(2);
	});
});
