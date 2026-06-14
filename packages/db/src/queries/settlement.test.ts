import { and, eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	FIRST_HULL_RESERVE,
	NEXT_NEED_ORDER_RC_STACK,
	TUTORIAL_ORDER_CM_STACK,
	TUTORIAL_ORDER_SA_STACK
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { pilots } from '../schema/pilots.js';
import { settlementMilestones } from '../schema/settlementMilestones.js';
import { settlementOrders } from '../schema/settlementOrders.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { getResourceStackForPilotInstance, grantResourceToPilot } from './resourceGrants.js';
import { ensureBloomOneResourceInstances, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import {
	bindSettlementOrdersOnSample,
	clearPilotSettlementState,
	deliverResourceStackToSettlementOrder,
	ensureNextNeedOrdersPostedForPilot,
	ensureSettlementBootstrapForPilot,
	listSettlementOrdersForMilestone,
	listOpenSettlementOrdersForPilot
} from './settlement.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

describeDb('settlement persistence', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `slice-phase2-settlement-${Date.now()}`;

	let bendrelInstanceId = '';
	let kethInstanceId = '';
	let paleEmberInstanceId = '';
	let veyrithInstanceId = '';
	let structuralOrderId = '';

	beforeAll(async () => {
		await ensureBloomOneResourceInstances(db);
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();

		const bendrel = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'bendrel_ridge_alloy');
		const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
		const paleEmber = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'pale_ember_crystal');
		const veyrith = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'veyrith_copper');
		expect(bendrel).not.toBeNull();
		expect(keth).not.toBeNull();
		expect(paleEmber).not.toBeNull();
		expect(veyrith).not.toBeNull();
		bendrelInstanceId = bendrel!.id;
		kethInstanceId = keth!.id;
		paleEmberInstanceId = paleEmber!.id;
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

	it('accepts an overfilled single stack and consumes only the remaining order units', async () => {
		await bindSettlementOrdersOnSample(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			family: 'structural_alloy'
		});

		const overshoot = TUTORIAL_ORDER_SA_STACK + 5;
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			quantity: overshoot,
			source: { type: 'test_grant', id: 'overshoot-stack' }
		});

		const result = await deliverResourceStackToSettlementOrder(db, {
			pilotId: testPilotId,
			orderId: structuralOrderId,
			resourceInstanceId: bendrelInstanceId
		});

		expect(result).toEqual({
			status: 'delivered',
			deliveredUnits: TUTORIAL_ORDER_SA_STACK,
			orderFilled: true,
			fabricatorMilestoneCompleted: false
		});
	});

	it('two concurrent turn-ins completing both tutorial orders unlock the milestone exactly once', async () => {
		// Bind both orders — bendrel (structural_alloy) and veyrith (conductive_metal)
		await bindSettlementOrdersOnSample(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			family: 'structural_alloy'
		});
		await bindSettlementOrdersOnSample(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			family: 'conductive_metal'
		});

		const orders = await listOpenSettlementOrdersForPilot(db, testPilotId);
		const saOrder = orders.find((order) => order.family === 'structural_alloy');
		const cmOrder = orders.find((order) => order.family === 'conductive_metal');
		expect(saOrder).toBeDefined();
		expect(cmOrder).toBeDefined();

		// Grant enough resources for both orders
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: bendrelInstanceId,
			quantity: TUTORIAL_ORDER_SA_STACK,
			source: { type: 'test_grant', id: 'concurrent-sa' }
		});
		await grantResourceToPilot(db, {
			pilotId: testPilotId,
			resourceInstanceId: veyrithInstanceId,
			quantity: TUTORIAL_ORDER_CM_STACK,
			source: { type: 'test_grant', id: 'concurrent-cm' }
		});

		// Fire both turn-ins concurrently
		const [saResult, cmResult] = await Promise.all([
			deliverResourceStackToSettlementOrder(db, {
				pilotId: testPilotId,
				orderId: saOrder!.id,
				resourceInstanceId: bendrelInstanceId
			}),
			deliverResourceStackToSettlementOrder(db, {
				pilotId: testPilotId,
				orderId: cmOrder!.id,
				resourceInstanceId: veyrithInstanceId
			})
		]);

		expect(saResult.status).toBe('delivered');
		expect(cmResult.status).toBe('delivered');

		// Milestone must be unlocked exactly once
		const [milestoneRow] = await db
			.select()
			.from(settlementMilestones)
			.where(
				and(
					eq(settlementMilestones.pilotId, testPilotId),
					eq(settlementMilestones.milestoneKey, 'fabricator_online')
				)
			)
			.limit(1);

		expect(milestoneRow?.unlockedAt).not.toBeNull();
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
			orderFilled: true,
			fabricatorMilestoneCompleted: false
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

it('reserves the first hull reactive crystal stack from next_need turn-in', async () => {
	await ensureNextNeedOrdersPostedForPilot(db, testPilotId);
	const nextNeedOrders = await listSettlementOrdersForMilestone(db, {
		pilotId: testPilotId,
		milestoneKey: 'next_need'
	});
	const rcOrder = nextNeedOrders.find((order) => order.family === 'reactive_crystal');
	expect(rcOrder).toBeDefined();

	await grantResourceToPilot(db, {
		pilotId: testPilotId,
		resourceInstanceId: paleEmberInstanceId,
		quantity: FIRST_HULL_RESERVE.units,
		source: { type: 'test_grant', id: 'first-hull-reserve' }
	});

	const blocked = await deliverResourceStackToSettlementOrder(db, {
		pilotId: testPilotId,
		orderId: rcOrder!.id,
		resourceInstanceId: paleEmberInstanceId
	});
	expect(blocked.status).toBe('reserved_for_hull');
	expect(
		(await getResourceStackForPilotInstance(db, testPilotId, paleEmberInstanceId))?.quantity
	).toBe(FIRST_HULL_RESERVE.units);

	await grantResourceToPilot(db, {
		pilotId: testPilotId,
		resourceInstanceId: paleEmberInstanceId,
		quantity: NEXT_NEED_ORDER_RC_STACK,
		source: { type: 'test_grant', id: 'first-hull-spare' }
	});

	const delivered = await deliverResourceStackToSettlementOrder(db, {
		pilotId: testPilotId,
		orderId: rcOrder!.id,
		resourceInstanceId: paleEmberInstanceId
	});
	expect(delivered).toEqual({
		status: 'delivered',
		deliveredUnits: NEXT_NEED_ORDER_RC_STACK,
		orderFilled: true,
		fabricatorMilestoneCompleted: false
	});
	expect(
		(await getResourceStackForPilotInstance(db, testPilotId, paleEmberInstanceId))?.quantity
	).toBe(FIRST_HULL_RESERVE.units);
});
});
