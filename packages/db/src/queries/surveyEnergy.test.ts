import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { accrueEnergy, SAMPLE_ENERGY_COST, SURVEY_ENERGY_CAP } from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { pilotSurveyEnergy } from '../schema/pilotSurveyEnergy.js';
import {
	accrueAndPersistSurveyEnergy,
	ensurePilotSurveyEnergyRow,
	refillSurveyEnergyToCap,
	resolveStoredSurveyEnergy
} from './surveyEnergy.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('survey energy persistence', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `slice-phase2-energy-${Date.now()}`;
	const startedAt = new Date('2026-06-01T12:00:00.000Z');

	beforeAll(async () => {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await db.insert(pilotSurveyEnergy).values({
			pilotId: testPilotId,
			rawEnergy: 0,
			updatedAt: startedAt
		});
	});

	afterAll(async () => {
		await db.delete(pilotSurveyEnergy).where(eq(pilotSurveyEnergy.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('round-trips continuous trickle accrual through persisted raw energy', async () => {
		const row = await ensurePilotSurveyEnergyRow(db, testPilotId, startedAt);
		const twoHoursLaterMs = startedAt.getTime() + 2 * 3_600_000;

		const expected = accrueEnergy(
			{ rawEnergy: row.rawEnergy, updatedAtMs: row.updatedAt.getTime() },
			twoHoursLaterMs
		);

		const persisted = await accrueAndPersistSurveyEnergy(db, {
			pilotId: testPilotId,
			nowMs: twoHoursLaterMs
		});

		expect(persisted.rawEnergy).toBe(expected.rawEnergy);
		expect(persisted.updatedAt.getTime()).toBe(twoHoursLaterMs);

		const resolved = resolveStoredSurveyEnergy(
			{ rawEnergy: persisted.rawEnergy, updatedAt: persisted.updatedAt },
			twoHoursLaterMs
		);
		expect(resolved.energy).toBe(expected.rawEnergy);
		expect(resolved.energy).toBe(SAMPLE_ENERGY_COST);
		expect(resolved.energy).toBeLessThanOrEqual(SURVEY_ENERGY_CAP);
	});

	it('refillSurveyEnergyToCap restores a drained row to full cap', async () => {
		const drainedPilotId = `slice-refill-drained-${Date.now()}`;
		const now = new Date('2026-06-12T10:00:00.000Z');
		await db.insert(pilots).values({ id: drainedPilotId }).onConflictDoNothing();
		await db.insert(pilotSurveyEnergy).values({
			pilotId: drainedPilotId,
			rawEnergy: 8,
			updatedAt: now
		});

		const result = await refillSurveyEnergyToCap(db, drainedPilotId, now);

		expect(result.rawEnergy).toBe(SURVEY_ENERGY_CAP);
		expect(result.updatedAt.getTime()).toBe(now.getTime());

		await db.delete(pilotSurveyEnergy).where(eq(pilotSurveyEnergy.pilotId, drainedPilotId));
		await db.delete(pilots).where(eq(pilots.id, drainedPilotId));
	});

	it('refillSurveyEnergyToCap creates a missing row and fills to cap', async () => {
		const newPilotId = `slice-refill-new-${Date.now()}`;
		const now = new Date('2026-06-12T11:00:00.000Z');
		await db.insert(pilots).values({ id: newPilotId }).onConflictDoNothing();

		const result = await refillSurveyEnergyToCap(db, newPilotId, now);

		expect(result.rawEnergy).toBe(SURVEY_ENERGY_CAP);
		expect(result.updatedAt.getTime()).toBe(now.getTime());

		await db.delete(pilotSurveyEnergy).where(eq(pilotSurveyEnergy.pilotId, newPilotId));
		await db.delete(pilots).where(eq(pilots.id, newPilotId));
	});
});
