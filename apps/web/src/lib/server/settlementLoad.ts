import {
	countPlaytestEventsByName,
	getActiveSettlementMilestoneKey,
	backfillTutorialPatchedHullCondition,
	getEquippedThumperPartsForPilot,
	getPilotTutorialStep,
	getResourceInstanceById,
	getSettlementMilestoneUnlockedAt,
	listMissionOrderNudgeShownIds,
	listPilotResourceStacksWithInstances,
	listSettlementOrdersForMilestone,
	listThumperPartItemsForPilot,
	recordMissionOrderNudgeShown
} from '@async-frontier-mmo/db';
import {
	boundStackProgress,
	FIRST_HULL_RESERVE,
	firstHullReserveMap,
	missionTrackerState,
	pickActiveSettlementOrder,
	pickPinnedMissionOrder,
	REINFORCED_HULL_PLATE,
	SETTLEMENT_MILESTONES,
	type FamilyStackCandidate,
	type MissionTrackerState,
	type ResourceFamily,
	type SettlementMilestoneKey,
	type SettlementOrder
} from '@async-frontier-mmo/domain';
import { activeBloomDisplayName } from '$lib/bloomDisplay';
import { familyDisplayLabel } from '$lib/displayLabels';
import { foremanLine } from '$lib/copy/foreman';
import type { getGameDb } from './gameDb.js';
import { hullDeployContextFromEquipped } from './fieldDeployLoad.js';
import { loadFirstAsyncTailState } from './firstAsyncTailState.js';
import type { HullExtractionTailOption } from '@async-frontier-mmo/domain';

type ResourceInstanceRow = NonNullable<
	Awaited<ReturnType<typeof getResourceInstanceById>>
>;

export type SettlementEligibleStack = {
	resourceInstanceId: string;
	displayName: string;
	quantity: number;
	selectable: boolean;
	disabledReason: string | null;
};

export type SettlementBoundResource = {
	displayName: string;
	resourceSlug: string;
	turnedInUnits: number;
	inventoryUnits: number;
	remainingUnits: number;
	fieldStatus: 'on_field' | 'rotated_off';
	bloomLabel: string;
	fieldNote: string | null;
};

export type SettlementOrderCard = {
	id: string;
	family: ResourceFamily;
	familyLabel: string;
	stackSize: number;
	deliveredUnits: number;
	progressUnits: number;
	boundInstanceId: string | null;
	status: 'open' | 'filled' | 'cancelled';
	tracker: MissionTrackerState;
	progressPercent: number;
	eligibleStacks: SettlementEligibleStack[];
	boundResource: SettlementBoundResource | null;
	reserveNoticeLine?: string | null;
};

export type FirstHullReserveNotice = {
	familyLabel: string;
	resourceDisplayName: string;
	reservedUnits: number;
	requiredUnits: number;
	spareUnits: number;
	craftLabel: string;
	line: string;
};

export type SettlementScreenData = {
	milestoneKey: SettlementMilestoneKey;
	milestoneLabel: string;
	foremanLine: string;
	boardSummary: string;
	openOrderCount: number;
	filledOrderCount: number;
	orders: SettlementOrderCard[];
	activeOrderId: string | null;
	activeMissionLine: string | null;
	firstHullReserveNotice: FirstHullReserveNotice | null;
	showFabricatorTakeover: boolean;
	showPrologueTakeover: boolean;
	tutorialStep: string | null;
	showRecallLessonPrompt: boolean;
	showHullPatchAction: boolean;
	showAsyncDurationPicker: boolean;
	asyncTailOptions: HullExtractionTailOption[];
};

function milestoneLabelFor(key: SettlementMilestoneKey): string {
	return SETTLEMENT_MILESTONES.find((milestone) => milestone.key === key)?.label ?? key;
}

function buildMilestoneBoardSummary(input: {
	milestoneKey: SettlementMilestoneKey;
	milestoneLabel: string;
	openCount: number;
	filledCount: number;
	totalCount: number;
}): string {
	if (input.totalCount === 0) {
		return 'No orders posted for this milestone yet.';
	}

	if (input.openCount === 0) {
		return `All ${input.totalCount} orders filled — milestone complete.`;
	}

	if (input.milestoneKey === 'fabricator_online') {
		if (input.filledCount === 0) {
			return `${input.openCount} open · complete both to bring the fabricator online`;
		}

		return `${input.filledCount} filled · ${input.openCount} open — finish the last order`;
	}

	return `${input.filledCount} filled · ${input.openCount} open — ${input.milestoneLabel}`;
}

function mergeFamilyCandidates(
	family: ResourceFamily,
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>,
	boundInstance: Pick<ResourceInstanceRow, 'id' | 'displayName'> | null
): FamilyStackCandidate[] {
	const byInstance = new Map<string, FamilyStackCandidate>();

	for (const stack of inventory.filter((row) => row.family === family)) {
		byInstance.set(stack.resourceInstanceId, {
			instanceId: stack.resourceInstanceId,
			displayName: stack.displayName,
			unitsSampled: stack.quantity
		});
	}

	if (boundInstance && !byInstance.has(boundInstance.id)) {
		byInstance.set(boundInstance.id, {
			instanceId: boundInstance.id,
			displayName: boundInstance.displayName,
			unitsSampled: 0
		});
	}

	return [...byInstance.values()];
}

function inventoryUnitsForInstance(
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>,
	instanceId: string
): number {
	return (
		inventory.find((stack) => stack.resourceInstanceId === instanceId)?.quantity ?? 0
	);
}

function ownsReinforcedHullPlate(
	thumperPartItems: Awaited<ReturnType<typeof listThumperPartItemsForPilot>>
): boolean {
	return thumperPartItems.some((part) => part.schematicId === REINFORCED_HULL_PLATE.id);
}

function buildFirstHullReserveNotice(input: {
	milestoneKey: SettlementMilestoneKey;
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>;
	ownsHullPlate: boolean;
}): FirstHullReserveNotice | null {
	if (input.ownsHullPlate || input.milestoneKey !== 'next_need') {
		return null;
	}

	const reserveMap = firstHullReserveMap({
		milestoneKey: input.milestoneKey,
		stacks: input.inventory.map((stack) => ({
			resourceInstanceId: stack.resourceInstanceId,
			family: stack.family as ResourceFamily,
			quantity: stack.quantity
		})),
		ownsReinforcedHullPlate: input.ownsHullPlate
	});

	if (reserveMap.size === 0) {
		return null;
	}

	const [resourceInstanceId, reservedUnits] = [...reserveMap.entries()][0]!;
	const stack = input.inventory.find((entry) => entry.resourceInstanceId === resourceInstanceId);
	if (!stack) {
		return null;
	}

	const requiredUnits = FIRST_HULL_RESERVE.units;
	const spareUnits = Math.max(0, stack.quantity - reservedUnits);
	const craftLabel = REINFORCED_HULL_PLATE.displayName;
	const resourceDisplayName = stack.displayName;
	const familyLabel = familyDisplayLabel(FIRST_HULL_RESERVE.family);

	return {
		familyLabel,
		resourceDisplayName,
		reservedUnits,
		requiredUnits,
		spareUnits,
		craftLabel,
		line: `First hull reserve: ${reservedUnits}u ${resourceDisplayName} protected for ${craftLabel}. Foreman orders use spare Reactive Crystal only.`
	};
}

const RC_ORDER_RESERVE_NOTICE =
	'Reactive Crystal reserved for first hull does not count here; this order uses spare units only.';

function applyFirstHullReserve(
	milestoneKey: SettlementMilestoneKey,
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>,
	ownsHullPlate: boolean
): Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>> {
	const reserveMap = firstHullReserveMap({
		milestoneKey,
		stacks: inventory.map((stack) => ({
			resourceInstanceId: stack.resourceInstanceId,
			family: stack.family as ResourceFamily,
			quantity: stack.quantity
		})),
		ownsReinforcedHullPlate: ownsHullPlate
	});

	return inventory.map((stack) => ({
		...stack,
		quantity: Math.max(0, stack.quantity - (reserveMap.get(stack.resourceInstanceId) ?? 0))
	}));
}

function buildBoundResource(
	order: {
		boundInstanceId: string | null;
		deliveredUnits: number;
		stackSize: number;
	},
	instance: ResourceInstanceRow | null,
	inventoryUnits: number,
	progressUnits: number
): SettlementBoundResource | null {
	if (!order.boundInstanceId || !instance) {
		return null;
	}

	const remainingUnits = Math.max(0, order.stackSize - progressUnits);
	const rotatedOff = instance.extinctAt !== null;
	let fieldNote: string | null = null;

	if (rotatedOff) {
		fieldNote = `Rotated off FIELD (${activeBloomDisplayName(instance.bloomId)}). Turn in from inventory only — sampling the current bloom won't count.`;
	} else if (remainingUnits > 0 && inventoryUnits === 0) {
		fieldNote = `Find more ${instance.displayName} on FIELD — this order only accepts that exact resource.`;
	}

	return {
		displayName: instance.displayName,
		resourceSlug: instance.resourceSlug,
		turnedInUnits: order.deliveredUnits,
		inventoryUnits,
		remainingUnits,
		fieldStatus: rotatedOff ? 'rotated_off' : 'on_field',
		bloomLabel: activeBloomDisplayName(instance.bloomId),
		fieldNote
	};
}

async function loadBoundInstanceMap(
	db: ReturnType<typeof getGameDb>,
	instanceIds: string[]
): Promise<Map<string, ResourceInstanceRow>> {
	const uniqueIds = [...new Set(instanceIds)];
	const rows = await Promise.all(
		uniqueIds.map(async (instanceId) => {
			const row = await getResourceInstanceById(db, instanceId);
			return row ? ([instanceId, row] as const) : null;
		})
	);

	return new Map(rows.filter((entry): entry is [string, ResourceInstanceRow] => entry !== null));
}

function eligibleStacksForOrder(
	order: { family: ResourceFamily; boundInstanceId: string | null; status: string },
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>
): SettlementEligibleStack[] {
	// After first sample binds the order, commitment panel owns turn-in — no family picker.
	if (order.boundInstanceId !== null) {
		return [];
	}

	const familyStacks = inventory.filter((stack) => stack.family === order.family);

	return familyStacks.map((stack) => {
		if (order.status !== 'open') {
			return {
				resourceInstanceId: stack.resourceInstanceId,
				displayName: stack.displayName,
				quantity: stack.quantity,
				selectable: false,
				disabledReason: 'Order filled'
			};
		}

		if (stack.quantity <= 0) {
			return {
				resourceInstanceId: stack.resourceInstanceId,
				displayName: stack.displayName,
				quantity: stack.quantity,
				selectable: false,
				disabledReason: 'No units in stack'
			};
		}

		return {
			resourceInstanceId: stack.resourceInstanceId,
			displayName: stack.displayName,
			quantity: stack.quantity,
			selectable: true,
			disabledReason: null
		};
	});
}

function activeMissionFromOrders(
	orders: SettlementOrderCard[],
	milestoneKey: SettlementMilestoneKey
): {
	activeOrderId: string | null;
	activeMissionLine: string | null;
} {
	const active = pickPinnedMissionOrder(
		orders.map(
			(order): SettlementOrder => ({
				id: order.id,
				milestoneKey: '',
				family: order.family,
				stackSize: order.stackSize,
				boundInstanceId: order.boundInstanceId,
				deliveredUnits: order.deliveredUnits,
				status: order.status
			})
		),
		milestoneKey
	);

	if (!active) {
		return { activeOrderId: null, activeMissionLine: null };
	}

	const card = orders.find((order) => order.id === active.id);
	return {
		activeOrderId: active.id,
		activeMissionLine: card?.tracker.line ?? null
	};
}

type SettlementOrderRow = Awaited<
	ReturnType<typeof listSettlementOrdersForMilestone>
>[number];

async function buildSettlementOrderCards(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	orders: SettlementOrderRow[],
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>,
	nudgeShownOrderIds: Set<string>,
	options: {
		recordNudges: boolean;
		milestoneKey: SettlementMilestoneKey;
		ownsReinforcedHullPlate: boolean;
	}
): Promise<SettlementOrderCard[]> {
	const availableInventory = applyFirstHullReserve(
		options.milestoneKey,
		inventory,
		options.ownsReinforcedHullPlate
	);
	const boundInstanceMap = await loadBoundInstanceMap(
		db,
		orders
			.map((order) => order.boundInstanceId)
			.filter((instanceId): instanceId is string => instanceId !== null)
	);
	const orderCards: SettlementOrderCard[] = [];
	const nudgeOrdersToRecord: string[] = [];

	for (const order of orders) {
		const boundInstance =
			order.boundInstanceId !== null
				? (boundInstanceMap.get(order.boundInstanceId) ?? null)
				: null;
		const candidates = mergeFamilyCandidates(order.family, availableInventory, boundInstance);
		const nudgeShown = nudgeShownOrderIds.has(order.id);
		const tracker = missionTrackerState(order, candidates, { nudgeShown });
		if (options.recordNudges && tracker.kind === 'bound' && tracker.nudge) {
			nudgeOrdersToRecord.push(order.id);
		}

		const progressUnits = boundStackProgress(order, candidates);
		const progressPercent =
			order.stackSize > 0
				? Math.min(100, Math.round((progressUnits / order.stackSize) * 100))
				: 0;

	const inventoryUnits =
		order.boundInstanceId !== null
			? inventoryUnitsForInstance(availableInventory, order.boundInstanceId)
			: 0;

		orderCards.push({
			id: order.id,
			family: order.family,
			familyLabel: familyDisplayLabel(order.family),
			stackSize: order.stackSize,
			deliveredUnits: order.deliveredUnits,
			progressUnits,
			boundInstanceId: order.boundInstanceId,
			status: order.status,
			tracker,
			progressPercent,
			eligibleStacks: eligibleStacksForOrder(order, availableInventory),
			boundResource: buildBoundResource(
				order,
				boundInstance,
				inventoryUnits,
				progressUnits
			),
			reserveNoticeLine:
				!options.ownsReinforcedHullPlate &&
				options.milestoneKey === 'next_need' &&
				order.family === 'reactive_crystal' &&
				order.status === 'open'
					? RC_ORDER_RESERVE_NOTICE
					: null
		});
	}

	if (options.recordNudges) {
		for (const orderId of nudgeOrdersToRecord) {
			await recordMissionOrderNudgeShown(db, pilotId, orderId);
		}
	}

	return orderCards;
}

/** Order progress line after a field sample — hunting-step feedback. */
export async function loadActiveOrderStatusLine(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<string | null> {
	const milestoneKey = await getActiveSettlementMilestoneKey(db, pilotId);
	const [orders, inventory, thumperPartItems] = await Promise.all([
		listSettlementOrdersForMilestone(db, { pilotId, milestoneKey }),
		listPilotResourceStacksWithInstances(db, pilotId),
		listThumperPartItemsForPilot(db, pilotId)
	]);

	const active = pickActiveSettlementOrder(orders);
	if (!active || active.status !== 'open') {
		return null;
	}

	const boundInstance =
		active.boundInstanceId !== null
			? await getResourceInstanceById(db, active.boundInstanceId)
			: null;
	const availableInventory = applyFirstHullReserve(
		milestoneKey,
		inventory,
		ownsReinforcedHullPlate(thumperPartItems)
	);
	const candidates = mergeFamilyCandidates(active.family, availableInventory, boundInstance);
	const progressUnits = boundStackProgress(active, candidates);

	if (progressUnits >= active.stackSize) {
		return `ORDER FILLED — ${familyDisplayLabel(active.family)} stack complete. Return to SETTLEMENT to turn in.`;
	}

	return `Order progress: ${progressUnits}/${active.stackSize}u`;
}

/** Layout ticker only — never records one-shot nudges (those render on /settlement). */
export async function loadSettlementMissionTicker(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<string | null> {
	const milestoneKey = await getActiveSettlementMilestoneKey(db, pilotId);
	const [orders, inventory, nudgeShownOrderIds, thumperPartItems] = await Promise.all([
		listSettlementOrdersForMilestone(db, { pilotId, milestoneKey }),
		listPilotResourceStacksWithInstances(db, pilotId),
		listMissionOrderNudgeShownIds(db, pilotId),
		listThumperPartItemsForPilot(db, pilotId)
	]);

	const orderCards = await buildSettlementOrderCards(
		db,
		pilotId,
		orders,
		inventory,
		nudgeShownOrderIds,
		{
			recordNudges: false,
			milestoneKey,
			ownsReinforcedHullPlate: ownsReinforcedHullPlate(thumperPartItems)
		}
	);

	return activeMissionFromOrders(orderCards, milestoneKey).activeMissionLine;
}

export async function hasOrderReadyToTurnIn(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<boolean> {
	const milestoneKey = await getActiveSettlementMilestoneKey(db, pilotId);
	const [orders, inventory, nudgeShownOrderIds, thumperPartItems] = await Promise.all([
		listSettlementOrdersForMilestone(db, { pilotId, milestoneKey }),
		listPilotResourceStacksWithInstances(db, pilotId),
		listMissionOrderNudgeShownIds(db, pilotId),
		listThumperPartItemsForPilot(db, pilotId)
	]);

	const orderCards = await buildSettlementOrderCards(
		db,
		pilotId,
		orders,
		inventory,
		nudgeShownOrderIds,
		{
			recordNudges: false,
			milestoneKey,
			ownsReinforcedHullPlate: ownsReinforcedHullPlate(thumperPartItems)
		}
	);

	return orderCards.some(
		(order) => order.status === 'open' && order.progressUnits >= order.stackSize
	);
}

export async function loadSettlementScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<SettlementScreenData> {
	await backfillTutorialPatchedHullCondition(db, pilotId);
	const milestoneKey = await getActiveSettlementMilestoneKey(db, pilotId);
	const [
		orders,
		inventory,
		tutorialStep,
		fabricatorUnlockedAt,
		fabricatorSeenCount,
		nudgeShownOrderIds,
		equipped,
		thumperPartItems
	] = await Promise.all([
		listSettlementOrdersForMilestone(db, { pilotId, milestoneKey }),
		listPilotResourceStacksWithInstances(db, pilotId),
		getPilotTutorialStep(db, pilotId),
		getSettlementMilestoneUnlockedAt(db, { pilotId, milestoneKey: 'fabricator_online' }),
		countPlaytestEventsByName(db, pilotId, 'fabricator_online_seen'),
		listMissionOrderNudgeShownIds(db, pilotId),
		getEquippedThumperPartsForPilot(db, pilotId),
		listThumperPartItemsForPilot(db, pilotId)
	]);

	const openOrders = orders.filter((order) => order.status === 'open');
	const orderCards = await buildSettlementOrderCards(
		db,
		pilotId,
		orders,
		inventory,
		nudgeShownOrderIds,
		{
			recordNudges: true,
			milestoneKey,
			ownsReinforcedHullPlate: ownsReinforcedHullPlate(thumperPartItems)
		}
	);

	const { activeOrderId, activeMissionLine } = activeMissionFromOrders(orderCards, milestoneKey);
	const sortedOrders = activeOrderId
		? [
				...orderCards.filter((order) => order.id === activeOrderId),
				...orderCards.filter((order) => order.id !== activeOrderId)
			]
		: orderCards;

	const fabricatorUnlocked = fabricatorUnlockedAt !== null;
	const filledOrders = orderCards.filter((order) => order.status === 'filled');
	const milestoneLabel = milestoneLabelFor(milestoneKey);
	const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });
	const { tailMenuOptions: asyncTailOptions } = hullDeployContextFromEquipped(equipped, firstAsync);

	const orderReadyToTurnIn = orderCards.some(
		(order) => order.status === 'open' && order.progressUnits >= order.stackSize
	);
	const ownsHullPlate = ownsReinforcedHullPlate(thumperPartItems);
	const firstHullReserveNotice = buildFirstHullReserveNotice({
		milestoneKey,
		inventory,
		ownsHullPlate
	});

	return {
		milestoneKey,
		milestoneLabel,
		foremanLine: foremanLine({
			tutorialStep,
			milestoneLabel,
			hasOpenOrders: openOrders.length > 0,
			fabricatorUnlocked,
			orderReadyToTurnIn,
			openOrderCount: openOrders.length,
			filledOrderCount: filledOrders.length
		}),
		boardSummary: buildMilestoneBoardSummary({
			milestoneKey,
			milestoneLabel,
			openCount: openOrders.length,
			filledCount: filledOrders.length,
			totalCount: orderCards.length
		}),
		openOrderCount: openOrders.length,
		filledOrderCount: filledOrders.length,
		orders: sortedOrders,
		activeOrderId,
		activeMissionLine,
		firstHullReserveNotice,
		showFabricatorTakeover: fabricatorUnlocked && fabricatorSeenCount === 0,
		showPrologueTakeover: tutorialStep === 'prologue',
		tutorialStep,
		showRecallLessonPrompt: tutorialStep === 'recall_lesson',
		showHullPatchAction: tutorialStep === 'hull_patch',
		showAsyncDurationPicker: tutorialStep === 'async_reveal',
		asyncTailOptions
	};
}
