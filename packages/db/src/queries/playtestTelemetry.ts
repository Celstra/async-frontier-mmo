import { and, desc, eq, sql } from 'drizzle-orm';
import type { PlaytestEventName } from '../playtest/eventNames.js';
import { pilotDepositSpotSamples } from '../schema/pilotDepositSpotSamples.js';
import { pilotFamilyScans } from '../schema/pilotFamilyScans.js';
import { playtestEvents } from '../schema/playtestEvents.js';
import type { Db, DbExecutor } from '../client.js';

export type PlaytestEventPayload = Record<string, unknown>;

export async function recordPlaytestEvent(
	db: DbExecutor,
	input: {
		pilotId: string;
		eventName: PlaytestEventName;
		payload?: PlaytestEventPayload;
		createdAt?: Date;
	}
): Promise<void> {
	await db.insert(playtestEvents).values({
		pilotId: input.pilotId,
		eventName: input.eventName,
		payload: input.payload ?? {},
		createdAt: input.createdAt
	});
}

/** Inserts only when this pilot has not yet logged the event name. */
export async function recordPlaytestEventOnce(
	db: DbExecutor,
	input: {
		pilotId: string;
		eventName: PlaytestEventName;
		payload?: PlaytestEventPayload;
		createdAt?: Date;
	}
): Promise<boolean> {
	const [existing] = await db
		.select({ id: playtestEvents.id })
		.from(playtestEvents)
		.where(
			and(
				eq(playtestEvents.pilotId, input.pilotId),
				eq(playtestEvents.eventName, input.eventName)
			)
		)
		.limit(1);

	if (existing) {
		return false;
	}

	await recordPlaytestEvent(db, input);
	return true;
}

export async function listPlaytestEventsForPilot(
	db: Db,
	pilotId: string
): Promise<
	Array<{
		id: string;
		eventName: string;
		payload: unknown;
		createdAt: Date;
	}>
> {
	return db
		.select({
			id: playtestEvents.id,
			eventName: playtestEvents.eventName,
			payload: playtestEvents.payload,
			createdAt: playtestEvents.createdAt
		})
		.from(playtestEvents)
		.where(eq(playtestEvents.pilotId, pilotId))
		.orderBy(playtestEvents.createdAt);
}

export async function getLatestPlaytestEventCreatedAt(
	db: DbExecutor,
	pilotId: string
): Promise<Date | null> {
	const [row] = await db
		.select({ createdAt: playtestEvents.createdAt })
		.from(playtestEvents)
		.where(eq(playtestEvents.pilotId, pilotId))
		.orderBy(desc(playtestEvents.createdAt))
		.limit(1);

	return row?.createdAt ?? null;
}

export async function getPlaytestEventOnce(
	db: DbExecutor,
	pilotId: string,
	eventName: PlaytestEventName
): Promise<{ payload: PlaytestEventPayload; createdAt: Date } | null> {
	const [row] = await db
		.select({
			payload: playtestEvents.payload,
			createdAt: playtestEvents.createdAt
		})
		.from(playtestEvents)
		.where(and(eq(playtestEvents.pilotId, pilotId), eq(playtestEvents.eventName, eventName)))
		.limit(1);

	if (!row) {
		return null;
	}

	return {
		payload: (row.payload ?? {}) as PlaytestEventPayload,
		createdAt: row.createdAt
	};
}

export async function countPlaytestEventsByName(
	db: DbExecutor,
	pilotId: string,
	eventName: PlaytestEventName
): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(playtestEvents)
		.where(and(eq(playtestEvents.pilotId, pilotId), eq(playtestEvents.eventName, eventName)));

	return row?.count ?? 0;
}

export async function countPilotFamilyScans(db: DbExecutor, pilotId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(pilotFamilyScans)
		.where(eq(pilotFamilyScans.pilotId, pilotId));

	return row?.count ?? 0;
}

export async function countPilotDepositSamples(db: DbExecutor, pilotId: string): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(pilotDepositSpotSamples)
		.where(eq(pilotDepositSpotSamples.pilotId, pilotId));

	return row?.count ?? 0;
}

export async function listMissionOrderNudgeShownIds(
	db: DbExecutor,
	pilotId: string
): Promise<Set<string>> {
	const rows = await db
		.select({ payload: playtestEvents.payload })
		.from(playtestEvents)
		.where(
			and(
				eq(playtestEvents.pilotId, pilotId),
				eq(playtestEvents.eventName, 'mission_order_nudge_shown')
			)
		);

	const orderIds = new Set<string>();
	for (const row of rows) {
		const orderId =
			typeof row.payload === 'object' &&
			row.payload !== null &&
			'orderId' in row.payload &&
			typeof row.payload.orderId === 'string'
				? row.payload.orderId
				: null;
		if (orderId) {
			orderIds.add(orderId);
		}
	}

	return orderIds;
}

export async function recordMissionOrderNudgeShown(
	db: DbExecutor,
	pilotId: string,
	orderId: string
): Promise<void> {
	const shown = await listMissionOrderNudgeShownIds(db, pilotId);
	if (shown.has(orderId)) {
		return;
	}

	await recordPlaytestEvent(db, {
		pilotId,
		eventName: 'mission_order_nudge_shown',
		payload: { orderId }
	});
}

/** Logs craft_started at most once per pilot + craft idempotency key. */
export async function recordCraftStartedOnce(
	db: DbExecutor,
	input: {
		pilotId: string;
		payload: { schematicId: string; craftMode: string; idempotencyKey: string };
		createdAt?: Date;
	}
): Promise<boolean> {
	const [existing] = await db
		.select({ id: playtestEvents.id })
		.from(playtestEvents)
		.where(
			and(
				eq(playtestEvents.pilotId, input.pilotId),
				eq(playtestEvents.eventName, 'craft_started'),
				sql`${playtestEvents.payload}->>'idempotencyKey' = ${input.payload.idempotencyKey}`
			)
		)
		.limit(1);

	if (existing) {
		return false;
	}

	await recordPlaytestEvent(db, {
		pilotId: input.pilotId,
		eventName: 'craft_started',
		payload: input.payload,
		createdAt: input.createdAt
	});
	return true;
}

/** Logs supply_crate_available at most once per pilot + crate id (race-safe via partial unique index). */
export async function recordSupplyCrateAvailableOnce(
	db: DbExecutor,
	input: {
		pilotId: string;
		payload: { crateId: string; reason: string; sequence: number };
		createdAt?: Date;
	}
): Promise<boolean> {
	try {
		await db.insert(playtestEvents).values({
			pilotId: input.pilotId,
			eventName: 'supply_crate_available',
			payload: input.payload,
			createdAt: input.createdAt ?? new Date()
		});
		return true;
	} catch (error) {
		if (isUniqueViolation(error)) {
			return false;
		}
		throw error;
	}
}

function isUniqueViolation(error: unknown): boolean {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code: string }).code === '23505'
	);
}
