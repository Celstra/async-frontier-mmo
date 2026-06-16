import {
	buildEmergencySupplyCratePayload,
	buildSupplyCratePayload,
	canCraftAnyWorkshopThumperPart,
	WORKSHOP_CRAFT_COUNT_CRATE_INTERVAL,
	WORKSHOP_CRATE_UNITS_PER_FAMILY,
	WORKSHOP_TIMER_CRATE_MINUTES,
	type ResourceFamily,
	type WorkshopSupplyCrateReason
} from '@async-frontier-mmo/domain';
import { and, asc, eq, lte } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { pilotWorkshopState } from '../schema/pilotWorkshopState.js';
import {
	workshopCrates,
	type WorkshopCratePayloadLine,
	type WorkshopSupplyCrateStatus
} from '../schema/workshopCrates.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import { listPilotWorkshopBenchStacksWithInstances } from './workshopBenchInventory.js';
import { ensurePilotWorkshopStateTx, getWorkshopBenchInstanceBySlug, getPilotWorkshopState } from './workshopSlice.js';

export class WorkshopCrateNotFoundError extends Error {
	constructor(crateId: string) {
		super(`Workshop crate not found: ${crateId}`);
		this.name = 'WorkshopCrateNotFoundError';
	}
}

export class WorkshopCrateUnavailableError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'WorkshopCrateUnavailableError';
	}
}

async function resolvePayloadInstanceIds(
	db: DbExecutor,
	payload: ReturnType<typeof buildSupplyCratePayload>
): Promise<WorkshopCratePayloadLine[]> {
	const lines: WorkshopCratePayloadLine[] = [];
	for (const line of payload) {
		const instance = await getWorkshopBenchInstanceBySlug(db, line.resourceSlug);
		lines.push({
			resourceSlug: line.resourceSlug,
			resourceInstanceId: instance.id,
			quantity: line.quantity
		});
	}
	return lines;
}

/** Serialize timer/craft-count crate minting on the pilot workshop state row. */
async function lockPilotWorkshopStateForUpdateTx(
	db: DbExecutor,
	pilotId: string,
	now = new Date()
) {
	await ensurePilotWorkshopStateTx(db, pilotId, now);
	const [state] = await db
		.select()
		.from(pilotWorkshopState)
		.where(eq(pilotWorkshopState.pilotId, pilotId))
		.for('update')
		.limit(1);

	if (!state) {
		throw new Error(`Missing pilot workshop state after ensure: ${pilotId}`);
	}

	return state;
}

async function insertWorkshopCrateWithLockedStateTx(
	db: DbExecutor,
	input: {
		pilotId: string;
		reason: WorkshopSupplyCrateReason;
		now: Date;
		unitsPerFamily: number;
		lockedState: typeof pilotWorkshopState.$inferSelect;
	}
) {
	const payload = await resolvePayloadInstanceIds(
		db,
		buildSupplyCratePayload({
			mode: 'fixed',
			unitsPerFamily: input.unitsPerFamily
		})
	);
	const sequence = input.lockedState.crateSequence + 1;

	const [crate] = await db
		.insert(workshopCrates)
		.values({
			pilotId: input.pilotId,
			sequence,
			reason: input.reason,
			status: 'available',
			availableAt: input.now,
			payload
		})
		.returning();

	input.lockedState.crateSequence = sequence;
	return crate!;
}

export async function createWorkshopCrateTx(
	db: DbExecutor,
	input: {
		pilotId: string;
		reason: WorkshopSupplyCrateReason;
		now?: Date;
		unitsPerFamily?: number;
	}
) {
	const now = input.now ?? new Date();
	const lockedState = await lockPilotWorkshopStateForUpdateTx(db, input.pilotId, now);
	const crate = await insertWorkshopCrateWithLockedStateTx(db, {
		pilotId: input.pilotId,
		reason: input.reason,
		now,
		unitsPerFamily: input.unitsPerFamily ?? WORKSHOP_CRATE_UNITS_PER_FAMILY,
		lockedState
	});

	await db
		.update(pilotWorkshopState)
		.set({ crateSequence: lockedState.crateSequence, updatedAt: now })
		.where(eq(pilotWorkshopState.pilotId, input.pilotId));

	return crate;
}

export async function createEmergencyWorkshopCrateTx(db: DbExecutor, pilotId: string, now = new Date()) {
	const payload = await resolvePayloadInstanceIds(db, buildEmergencySupplyCratePayload('fixed'));
	const lockedState = await lockPilotWorkshopStateForUpdateTx(db, pilotId, now);
	const sequence = lockedState.crateSequence + 1;

	const [crate] = await db
		.insert(workshopCrates)
		.values({
			pilotId,
			sequence,
			reason: 'emergency',
			status: 'available',
			availableAt: now,
			payload
		})
		.returning();

	await db
		.update(pilotWorkshopState)
		.set({ crateSequence: sequence, updatedAt: now })
		.where(eq(pilotWorkshopState.pilotId, pilotId));

	return crate!;
}

/**
 * Mint one timer crate when due — at most one per sync pass.
 * Matches "every N minutes while you are in the workshop": the client polls
 * while the tab is visible; AFK wall-clock catch-up does not stack crates.
 */
export async function refreshTimedWorkshopCratesTx(db: DbExecutor, pilotId: string, now = new Date()) {
	const lockedState = await lockPilotWorkshopStateForUpdateTx(db, pilotId, now);
	const nextTimedCrateAt = lockedState.nextTimedCrateAt;

	if (!nextTimedCrateAt || now < nextTimedCrateAt) {
		return null;
	}

	const timerIntervalMs = WORKSHOP_TIMER_CRATE_MINUTES * 60_000;
	const crate = await insertWorkshopCrateWithLockedStateTx(db, {
		pilotId,
		reason: 'timer',
		now,
		unitsPerFamily: WORKSHOP_CRATE_UNITS_PER_FAMILY,
		lockedState
	});

	const advancedNextTimedCrateAt = new Date(
		Math.max(now.getTime() + timerIntervalMs, nextTimedCrateAt.getTime() + timerIntervalMs)
	);

	await db
		.update(pilotWorkshopState)
		.set({
			nextTimedCrateAt: advancedNextTimedCrateAt,
			crateSequence: lockedState.crateSequence,
			updatedAt: now
		})
		.where(eq(pilotWorkshopState.pilotId, pilotId));

	return crate;
}

export async function listWorkshopCratesForPilot(
	db: DbExecutor,
	pilotId: string,
	status?: WorkshopSupplyCrateStatus
) {
	const conditions = status
		? and(eq(workshopCrates.pilotId, pilotId), eq(workshopCrates.status, status))
		: eq(workshopCrates.pilotId, pilotId);

	return db
		.select()
		.from(workshopCrates)
		.where(conditions)
		.orderBy(asc(workshopCrates.sequence));
}

export type OpenWorkshopCrateOutcome =
	| { status: 'opened'; crate: typeof workshopCrates.$inferSelect }
	| { status: 'already_opened'; crate: typeof workshopCrates.$inferSelect };

export async function openWorkshopCrateForPilot(
	db: Db,
	input: { pilotId: string; crateId: string; idempotencyKey: string; now?: Date }
): Promise<OpenWorkshopCrateOutcome> {
	const now = input.now ?? new Date();

	return db.transaction(async (tx) => {
		const [claimed] = await tx
			.update(workshopCrates)
			.set({ status: 'opened', openedAt: now })
			.where(
				and(
					eq(workshopCrates.id, input.crateId),
					eq(workshopCrates.pilotId, input.pilotId),
					eq(workshopCrates.status, 'available' as WorkshopSupplyCrateStatus),
					lte(workshopCrates.availableAt, now)
				)
			)
			.returning();

		if (!claimed) {
			const [crate] = await tx
				.select()
				.from(workshopCrates)
				.where(and(eq(workshopCrates.id, input.crateId), eq(workshopCrates.pilotId, input.pilotId)))
				.limit(1);

			if (!crate) {
				throw new WorkshopCrateNotFoundError(input.crateId);
			}

			if (crate.status === 'opened') {
				return { status: 'already_opened' as const, crate };
			}

			throw new WorkshopCrateUnavailableError('Crate is not available to open yet');
		}

		for (const line of claimed.payload) {
			await grantResourceToPilotTx(tx, {
				pilotId: input.pilotId,
				resourceInstanceId: line.resourceInstanceId,
				quantity: line.quantity,
				source: { type: 'workshop_crate', id: claimed.id }
			});
		}

		await appendEconomyLedgerEntry(tx, {
			eventType: 'resource_granted',
			pilotId: input.pilotId,
			payload: {
				source_type: 'workshop_crate_opened',
				source_id: claimed.id,
				idempotency_key: input.idempotencyKey,
				reason: claimed.reason,
				lines: claimed.payload
			},
			createdAt: now
		});

		return { status: 'opened' as const, crate: claimed };
	});
}

export async function isTimedWorkshopCrateDue(db: DbExecutor, pilotId: string, now = new Date()) {
	const state = await getPilotWorkshopState(db, pilotId);
	return Boolean(state?.nextTimedCrateAt && now >= state.nextTimedCrateAt);
}

export async function recordWorkshopCraftCompletionTx(db: DbExecutor, pilotId: string, now = new Date()) {
	const lockedState = await lockPilotWorkshopStateForUpdateTx(db, pilotId, now);
	const nextCount = lockedState.craftCountSinceCrate + 1;

	if (nextCount < WORKSHOP_CRAFT_COUNT_CRATE_INTERVAL) {
		await db
			.update(pilotWorkshopState)
			.set({
				craftCountSinceCrate: nextCount,
				updatedAt: now
			})
			.where(eq(pilotWorkshopState.pilotId, pilotId));
		return null;
	}

	const crate = await insertWorkshopCrateWithLockedStateTx(db, {
		pilotId,
		reason: 'craft_count',
		now,
		unitsPerFamily: WORKSHOP_CRATE_UNITS_PER_FAMILY,
		lockedState
	});

	await db
		.update(pilotWorkshopState)
		.set({
			craftCountSinceCrate: 0,
			crateSequence: lockedState.crateSequence,
			updatedAt: now
		})
		.where(eq(pilotWorkshopState.pilotId, pilotId));

	return crate;
}

async function pilotHasAnyAvailableCrate(db: DbExecutor, pilotId: string) {
	const available = await listWorkshopCratesForPilot(db, pilotId, 'available');
	return available.length > 0;
}

/** Mint a small emergency crate when bench stock cannot craft any active thumper part. */
export async function ensureEmergencyWorkshopCrateIfStuckTx(
	db: DbExecutor,
	pilotId: string,
	now = new Date()
) {
	const benchStacks = await listPilotWorkshopBenchStacksWithInstances(db, pilotId);
	const ownedStacks = benchStacks.map((stack) => ({
		resourceInstanceId: stack.resourceInstanceId,
		resourceSlug: stack.resourceSlug,
		displayName: stack.displayName,
		family: stack.family as ResourceFamily,
		quantity: stack.quantity
	}));

	if (canCraftAnyWorkshopThumperPart(ownedStacks)) {
		return null;
	}

	if (await pilotHasAnyAvailableCrate(db, pilotId)) {
		return null;
	}

	return createEmergencyWorkshopCrateTx(db, pilotId, now);
}

export async function syncWorkshopSupplyCratesForPilot(db: Db, pilotId: string, now = new Date()) {
	return db.transaction(async (tx) => {
		await refreshTimedWorkshopCratesTx(tx, pilotId, now);
		await ensureEmergencyWorkshopCrateIfStuckTx(tx, pilotId, now);
	});
}
