import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { pilots } from '../schema/pilots.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { ensureDemoPilot } from './pilots.js';
import { listEconomyLedgerEntriesForPilot } from './economyLedger.js';
import {
	ensureBloomOneResourceInstances,
	getResourceInstanceByBloomSlug,
	ResourceInstanceStatsImmutableError,
	type ResourceInstanceLifecyclePatch,
	updateResourceInstance
} from './resourceInstances.js';
import {
	getResourceStackForPilotInstance,
	grantResourceToPilot,
	listResourceStacksForPilot
} from './resourceGrants.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('resource economy integrity', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `lesson-13-test-${Date.now()}`;

	beforeAll(async () => {
		await ensureDemoPilot(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await ensureBloomOneResourceInstances(db);
	});

	afterAll(async () => {
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('rejects stat updates after insert', async () => {
		const veyrith = await getResourceInstanceByBloomSlug(db, 1, 'veyrith_copper');
		expect(veyrith).not.toBeNull();

		await expect(
			updateResourceInstance(db, veyrith!.id, {
				statConductivity: 1,
				extinctAt: null
			} as ResourceInstanceLifecyclePatch)
		).rejects.toBeInstanceOf(ResourceInstanceStatsImmutableError);

		const unchanged = await getResourceInstanceByBloomSlug(db, 1, 'veyrith_copper');
		expect(unchanged!.statConductivity).toBe(930);
	});

	it('combines duplicate grants into one stack', async () => {
		const veyrith = await getResourceInstanceByBloomSlug(db, 1, 'veyrith_copper');
		expect(veyrith).not.toBeNull();

		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrith!.id,
			quantity: 12,
			source: { type: 'test_grant', id: 'combine-a' }
		});
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrith!.id,
			quantity: 8,
			source: { type: 'test_grant', id: 'combine-b' }
		});

		const stacks = await listResourceStacksForPilot(db, testPilotId);
		const veyrithStacks = stacks.filter((stack) => stack.resourceInstanceId === veyrith!.id);
		expect(veyrithStacks).toHaveLength(1);
		expect(veyrithStacks[0]!.quantity).toBe(20);

		const stack = await getResourceStackForPilotInstance(db, testPilotId, veyrith!.id);
		expect(stack!.quantity).toBe(20);
	});

	it('writes a ledger row for every grant', async () => {
		const sorrel = await getResourceInstanceByBloomSlug(db, 1, 'sorrel_vein_copper');
		expect(sorrel).not.toBeNull();

		const beforeCount = (await listEconomyLedgerEntriesForPilot(db, testPilotId)).filter(
			(entry) => entry.eventType === 'resource_granted'
		).length;

		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: sorrel!.id,
			quantity: 5,
			source: { type: 'test_grant', id: 'ledger-check' }
		});

		const grants = (await listEconomyLedgerEntriesForPilot(db, testPilotId)).filter(
			(entry) => entry.eventType === 'resource_granted'
		);

		expect(grants.length).toBe(beforeCount + 1);
		const latest = grants.at(-1)!;
		expect(latest.quantityDelta).toBe(5);
		expect(latest.resourceInstanceId).toBe(sorrel!.id);
		expect(latest.pilotId).toBe(testPilotId);
	});

	it('requires explicit extinctAt for lifecycle updates', async () => {
		const bendrel = await getResourceInstanceByBloomSlug(db, 1, 'bendrel_ridge_alloy');
		expect(bendrel).not.toBeNull();

		const extinctAt = new Date('2026-01-01T00:00:00.000Z');
		await updateResourceInstance(db, bendrel!.id, { extinctAt });

		const marked = await getResourceInstanceByBloomSlug(db, 1, 'bendrel_ridge_alloy');
		expect(marked!.extinctAt?.toISOString()).toBe(extinctAt.toISOString());

		await updateResourceInstance(db, bendrel!.id, { extinctAt: null });
	});

	it('seeds nine bloom #1 resources', async () => {
		const bloom = await ensureBloomOneResourceInstances(db);
		expect(bloom.length).toBe(9);

		const veyrith = await getResourceInstanceByBloomSlug(db, 1, 'veyrith_copper');
		const glimmerfall = await getResourceInstanceByBloomSlug(db, 1, 'glimmerfall_shard');
		expect(veyrith!.concentrationMinPercent).toBe(20);
		expect(veyrith!.concentrationMaxPercent).toBe(50);
		expect(glimmerfall!.lifespanDays).toBe(9);
	});
});
