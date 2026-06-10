import { buildActiveBloomSurvey } from '@async-frontier-mmo/domain';
import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { pilots } from '../schema/pilots.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { getResourceStackForPilotInstance, grantResourceToPilot } from './resourceGrants.js';
import { ensureDemoPilot } from './pilots.js';
import {
	ensureBloomOneResourceInstances,
	getActiveBloomId,
	listSpawnableResourceInstances,
	resourceInstanceToSurveyResource
} from './resourceInstances.js';
import { rotateActiveBloom, type RotateBloomOutcome } from './bloomRotation.js';
import { restoreBloomRotationForTest } from './bloomRotation.testHelpers.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('manual bloom rotation', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-22-rotation-${Date.now()}`;
	let rotationToRestore: Extract<RotateBloomOutcome, { status: 'rotated' }> | null = null;

	beforeAll(async () => {
		await ensureDemoPilot(db);
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId, frameId: 'recon' }).onConflictDoNothing();
	});

	afterAll(async () => {
		if (rotationToRestore) {
			await restoreBloomRotationForTest(db, rotationToRestore);
		}

		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('retires extinct resources from surveys while owned stacks persist', async () => {
		const activeBloomIdBefore = await getActiveBloomId(db);
		const spawnableBefore = await listSpawnableResourceInstances(db);
		expect(spawnableBefore.length).toBeGreaterThan(0);

		const retiredResource = spawnableBefore[0]!;

		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: retiredResource.id,
			quantity: 12,
			source: { type: 'test_grant', id: 'rotation-stockpile' }
		});

		const rotation = await rotateActiveBloom(db, { pilotId: testPilotId });
		if (rotation.status !== 'rotated') {
			throw new Error('expected bloom rotation to succeed');
		}
		rotationToRestore = rotation;

		expect(rotation.previousBloomId).toBe(activeBloomIdBefore);

		const spawnable = await listSpawnableResourceInstances(db);
		expect(spawnable.every((row) => row.bloomId === rotation.newBloomId)).toBe(true);
		expect(spawnable.some((row) => row.id === retiredResource.id)).toBe(false);

		const survey = buildActiveBloomSurvey({
			bloomId: rotation.newBloomId,
			resources: spawnable.map(resourceInstanceToSurveyResource)
		});
		expect(
			survey.signals.some((signal) => signal.resourceSlug === retiredResource.resourceSlug)
		).toBe(false);

		const stack = await getResourceStackForPilotInstance(db, testPilotId, retiredResource.id);
		expect(stack?.quantity).toBe(12);

		await restoreBloomRotationForTest(db, rotation);
		rotationToRestore = null;

		const spawnableAfterRestore = await listSpawnableResourceInstances(db);
		expect(spawnableAfterRestore.every((row) => row.bloomId === rotation.previousBloomId)).toBe(
			true
		);
		expect(spawnableAfterRestore.some((row) => row.id === retiredResource.id)).toBe(true);
	});

	it('can rotate again from a generated bloom', async () => {
		const rotations: Extract<RotateBloomOutcome, { status: 'rotated' }>[] = [];

		try {
			const first = await rotateActiveBloom(db, { pilotId: testPilotId });
			if (first.status !== 'rotated') {
				throw new Error('expected first rotation to succeed');
			}
			rotations.push(first);

			const second = await rotateActiveBloom(db, { pilotId: testPilotId });
			if (second.status !== 'rotated') {
				throw new Error('expected second rotation to succeed');
			}
			rotations.push(second);

			expect(second.previousBloomId).toBe(first.newBloomId);
			expect(second.newBloomId).toBeGreaterThan(first.newBloomId);
		} finally {
			for (const rotation of rotations.reverse()) {
				await restoreBloomRotationForTest(db, rotation);
			}
		}
	});
});
