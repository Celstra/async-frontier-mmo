import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TUTORIAL_ORDER_SA_STACK } from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { settlementOrders } from '../schema/settlementOrders.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { grantResourceToPilot } from './resourceGrants.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import {
	bindSettlementOrdersOnSample,
	clearPilotSettlementState,
	deliverResourceStackToSettlementOrder,
	ensureSettlementBootstrapForPilot,
	listOpenSettlementOrdersForPilot
} from './settlement.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('settlement persistence', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `slice-phase2-settlement-${Date.now()}`;

	let bendrelInstanceId = '';
	let kethInstanceId = '';
	let veyrithInstanceId = '';
	let structuralOrderId = '';

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();

		const bendrel = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'bendrel_ridge_alloy');
		const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(bendrel).not.toBeNull();
		expect(keth).not.toBeNull();
		expect(veyrith).not.toBeNull();
		bendrelInstanceId = bendrel!.id;
		kethInstanceId = keth!.id;
		veyrithInstanceId = veyrith!.id;
	});

	beforeEach(async () => {
		await clearPilotSettlementState(db, testPilotId);
		await ensureSettlementBootstrapForPilot(db, testPilotId);

		const orders = await listOpenSettlementOrdersForPilot(db, testPilotId);
		const structural = orders.find((order) => order.family === 'structural_alloy');
		expect(structural).toBeDefined();
		structuralOrderId = structural!.id;
	});

	afterAll(async () => {
		await clearPilotSettlementState(db, testPilotId);
	});

	it('rejects turn-in for the wrong family', async () => {
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			quantity: TUTORIAL_ORDER_SA_STACK,
			source: { type: 'test_grant', id: 'wrong-family' }
		});

		const result = await deliverResourceStackToSettlementOrder(db, {
			pilotId: testPilotId,
			orderId: structuralOrderId,
			resourceInstanceId: veyrithInstanceId
		});

		expect(result.status).toBe('wrong_family');
	});

	it('binds an open order when the matching family is sampled', async () => {
		await bindSettlementOrdersOnSample(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			family: 'structural_alloy'
		});

		const [row] = await db
			.select()
			.from(settlementOrders)
			.where(eq(settlementOrders.id, structuralOrderId))
			.limit(1);

		expect(row?.boundInstanceId).toBe(bendrelInstanceId);
	});

	it('rejects turn-in for a different instance when the order is already bound', async () => {
		await bindSettlementOrdersOnSample(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			family: 'structural_alloy'
		});

		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: kethInstanceId,
			quantity: TUTORIAL_ORDER_SA_STACK,
			source: { type: 'test_grant', id: 'wrong-instance' }
		});

		const result = await deliverResourceStackToSettlementOrder(db, {
			pilotId: testPilotId,
			orderId: structuralOrderId,
			resourceInstanceId: kethInstanceId
		});

		expect(result.status).toBe('wrong_instance');
	});

	it('completes an order exactly at stack_size and unlocks the milestone', async () => {
		await bindSettlementOrdersOnSample(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			family: 'structural_alloy'
		});

		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			quantity: TUTORIAL_ORDER_SA_STACK,
			source: { type: 'test_grant', id: 'exact-stack' }
		});

		const result = await deliverResourceStackToSettlementOrder(db, {
			pilotId: testPilotId,
			orderId: structuralOrderId,
			resourceInstanceId: bendrelInstanceId
		});

		expect(result).toEqual({
			status: 'delivered',
			deliveredUnits: TUTORIAL_ORDER_SA_STACK,
			orderFilled: true
		});

		const [orderRow] = await db
			.select()
			.from(settlementOrders)
			.where(eq(settlementOrders.id, structuralOrderId))
			.limit(1);
		expect(orderRow?.status).toBe('filled');
		expect(orderRow?.deliveredUnits).toBe(TUTORIAL_ORDER_SA_STACK);

		const openOrders = await listOpenSettlementOrdersForPilot(db, testPilotId);
		expect(openOrders.some((order) => order.family === 'conductive_metal')).toBe(true);
	});
});
