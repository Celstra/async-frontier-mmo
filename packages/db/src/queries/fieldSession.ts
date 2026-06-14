import {
	discoveryPatchAround,
	mergeDiscoveredTiles,
	PLAYER_SPAWN_X,
	PLAYER_SPAWN_Y,
	SAMPLE_DURATION_SECONDS,
	spotIdFor,
	TOPOLOGY_GRID_HEIGHT,
	TOPOLOGY_GRID_WIDTH,
	type ResourceFamily
} from '@async-frontier-mmo/domain';
import { and, asc, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { pilotDepositSpotSamples } from '../schema/pilotDepositSpotSamples.js';
import { pilotFieldState } from '../schema/pilotFieldState.js';
import { pilotResourceStatReveals } from '../schema/pilotResourceStatReveals.js';
import { resourceInstances } from '../schema/resourceInstances.js';

export type PilotFieldSession = {
	pilotId: string;
	selectedFamily: ResourceFamily | null;
	resourceInstanceId: string | null;
	positionX: number;
	positionY: number;
	scannedTiles: string[];
	discoveredTiles: string[];
	pendingSample: {
		spotId: string;
		resourceInstanceId: string;
		startedAt: Date;
		completesAt: Date;
	} | null;
	updatedAt: Date;
};

function rowToSession(row: typeof pilotFieldState.$inferSelect): PilotFieldSession {
	const pendingSpotId = row.pendingSampleSpotId;
	const pendingResourceId = row.pendingSampleResourceInstanceId;
	const pendingStarted = row.pendingSampleStartedAt;
	const pendingCompletes = row.pendingSampleCompletesAt;

	return {
		pilotId: row.pilotId,
		selectedFamily: (row.selectedFamily as ResourceFamily | null) ?? null,
		resourceInstanceId: row.resourceInstanceId,
		positionX: row.positionX,
		positionY: row.positionY,
		scannedTiles: row.scannedTiles ?? [],
		discoveredTiles: row.discoveredTiles ?? [],
		pendingSample:
			pendingSpotId && pendingResourceId && pendingStarted && pendingCompletes
				? {
						spotId: pendingSpotId,
						resourceInstanceId: pendingResourceId,
						startedAt: pendingStarted,
						completesAt: pendingCompletes
					}
				: null,
		updatedAt: row.updatedAt
	};
}

export async function getPilotFieldSession(
	db: DbExecutor,
	pilotId: string
): Promise<PilotFieldSession | null> {
	const [row] = await db
		.select()
		.from(pilotFieldState)
		.where(eq(pilotFieldState.pilotId, pilotId))
		.limit(1);

	return row ? rowToSession(row) : null;
}

function spawnDiscoveryPatch(): string[] {
	return discoveryPatchAround(
		PLAYER_SPAWN_X,
		PLAYER_SPAWN_Y,
		TOPOLOGY_GRID_WIDTH,
		TOPOLOGY_GRID_HEIGHT
	);
}

async function persistDiscoveredTiles(
	db: DbExecutor,
	input: { pilotId: string; discoveredTiles: string[]; now?: Date }
): Promise<PilotFieldSession> {
	const now = input.now ?? new Date();
	const [row] = await db
		.update(pilotFieldState)
		.set({ discoveredTiles: input.discoveredTiles, updatedAt: now })
		.where(eq(pilotFieldState.pilotId, input.pilotId))
		.returning();

	return rowToSession(row!);
}

export async function discoverPilotFieldTiles(
	db: DbExecutor,
	input: {
		pilotId: string;
		x: number;
		y: number;
		gridWidth?: number;
		gridHeight?: number;
		now?: Date;
	}
): Promise<PilotFieldSession> {
	const session = await ensurePilotFieldSession(db, input.pilotId, input.now);
	const gridWidth = input.gridWidth ?? TOPOLOGY_GRID_WIDTH;
	const gridHeight = input.gridHeight ?? TOPOLOGY_GRID_HEIGHT;
	const discoveredTiles = mergeDiscoveredTiles(session.discoveredTiles, [
		...discoveryPatchAround(input.x, input.y, gridWidth, gridHeight),
		...session.scannedTiles
	]);

	return persistDiscoveredTiles(db, {
		pilotId: input.pilotId,
		discoveredTiles,
		now: input.now
	});
}

export async function ensurePilotFieldSession(
	db: DbExecutor,
	pilotId: string,
	now = new Date()
): Promise<PilotFieldSession> {
	const existing = await getPilotFieldSession(db, pilotId);
	if (existing) {
		return existing;
	}

	const [row] = await db
		.insert(pilotFieldState)
		.values({
			pilotId,
			positionX: PLAYER_SPAWN_X,
			positionY: PLAYER_SPAWN_Y,
			scannedTiles: [],
			discoveredTiles: [],
			updatedAt: now
		})
		.returning();

	return rowToSession(row!);
}

export async function setPilotFieldFamily(
	db: DbExecutor,
	input: { pilotId: string; family: ResourceFamily; now?: Date }
): Promise<PilotFieldSession> {
	const now = input.now ?? new Date();
	await ensurePilotFieldSession(db, input.pilotId, now);

	const [row] = await db
		.update(pilotFieldState)
		.set({
			selectedFamily: input.family,
			resourceInstanceId: null,
			positionX: PLAYER_SPAWN_X,
			positionY: PLAYER_SPAWN_Y,
			scannedTiles: [],
			discoveredTiles: [],
			pendingSampleSpotId: null,
			pendingSampleResourceInstanceId: null,
			pendingSampleStartedAt: null,
			pendingSampleCompletesAt: null,
			updatedAt: now
		})
		.where(eq(pilotFieldState.pilotId, input.pilotId))
		.returning();

	return rowToSession(row!);
}

export async function setPilotFieldResource(
	db: DbExecutor,
	input: { pilotId: string; resourceInstanceId: string; now?: Date }
): Promise<PilotFieldSession> {
	const now = input.now ?? new Date();
	await ensurePilotFieldSession(db, input.pilotId, now);

	const [row] = await db
		.update(pilotFieldState)
		.set({
			resourceInstanceId: input.resourceInstanceId,
			positionX: PLAYER_SPAWN_X,
			positionY: PLAYER_SPAWN_Y,
			scannedTiles: [],
			discoveredTiles: spawnDiscoveryPatch(),
			pendingSampleSpotId: null,
			pendingSampleResourceInstanceId: null,
			pendingSampleStartedAt: null,
			pendingSampleCompletesAt: null,
			updatedAt: now
		})
		.where(eq(pilotFieldState.pilotId, input.pilotId))
		.returning();

	return rowToSession(row!);
}

export async function setPilotFieldPosition(
	db: DbExecutor,
	input: { pilotId: string; x: number; y: number; now?: Date }
): Promise<PilotFieldSession> {
	const now = input.now ?? new Date();
	await ensurePilotFieldSession(db, input.pilotId, now);

	await db
		.update(pilotFieldState)
		.set({ positionX: input.x, positionY: input.y, updatedAt: now })
		.where(eq(pilotFieldState.pilotId, input.pilotId));

	return discoverPilotFieldTiles(db, {
		pilotId: input.pilotId,
		x: input.x,
		y: input.y,
		now
	});
}

export async function movePilotOnField(
	db: DbExecutor,
	input: { pilotId: string; dx: number; dy: number; gridWidth: number; gridHeight: number; now?: Date }
): Promise<PilotFieldSession | { error: 'out_of_bounds' | 'pending_sample' }> {
	const session = await ensurePilotFieldSession(db, input.pilotId, input.now);
	if (session.pendingSample) {
		return { error: 'pending_sample' };
	}

	const nextX = session.positionX + input.dx;
	const nextY = session.positionY + input.dy;
	if (nextX < 0 || nextY < 0 || nextX >= input.gridWidth || nextY >= input.gridHeight) {
		return { error: 'out_of_bounds' };
	}

	const now = input.now ?? new Date();
	await db
		.update(pilotFieldState)
		.set({ positionX: nextX, positionY: nextY, updatedAt: now })
		.where(eq(pilotFieldState.pilotId, input.pilotId));

	return discoverPilotFieldTiles(db, {
		pilotId: input.pilotId,
		x: nextX,
		y: nextY,
		gridWidth: input.gridWidth,
		gridHeight: input.gridHeight,
		now
	});
}

export async function scanPilotFieldTile(
	db: DbExecutor,
	input: { pilotId: string; x: number; y: number; now?: Date }
): Promise<PilotFieldSession> {
	const session = await ensurePilotFieldSession(db, input.pilotId, input.now);
	const key = `${input.x},${input.y}`;
	const scannedTiles = session.scannedTiles.includes(key)
		? session.scannedTiles
		: [...session.scannedTiles, key];
	const now = input.now ?? new Date();

	await db
		.update(pilotFieldState)
		.set({ scannedTiles, updatedAt: now })
		.where(eq(pilotFieldState.pilotId, input.pilotId));

	return discoverPilotFieldTiles(db, {
		pilotId: input.pilotId,
		x: input.x,
		y: input.y,
		now
	});
}

export async function startPilotFieldSample(
	db: DbExecutor,
	input: {
		pilotId: string;
		resourceInstanceId: string;
		x: number;
		y: number;
		now?: Date;
	}
): Promise<PilotFieldSession | { error: 'pending_sample' }> {
	const session = await ensurePilotFieldSession(db, input.pilotId, input.now);
	if (session.pendingSample) {
		return { error: 'pending_sample' };
	}

	const now = input.now ?? new Date();
	const completesAt = new Date(now.getTime() + SAMPLE_DURATION_SECONDS * 1000);
	const spotId = spotIdFor(input.resourceInstanceId, input.x, input.y);

	const [row] = await db
		.update(pilotFieldState)
		.set({
			pendingSampleSpotId: spotId,
			pendingSampleResourceInstanceId: input.resourceInstanceId,
			pendingSampleStartedAt: now,
			pendingSampleCompletesAt: completesAt,
			updatedAt: now
		})
		.where(eq(pilotFieldState.pilotId, input.pilotId))
		.returning();

	return rowToSession(row!);
}

export async function clearPilotFieldPendingSample(
	db: DbExecutor,
	pilotId: string,
	now = new Date()
): Promise<void> {
	await db
		.update(pilotFieldState)
		.set({
			pendingSampleSpotId: null,
			pendingSampleResourceInstanceId: null,
			pendingSampleStartedAt: null,
			pendingSampleCompletesAt: null,
			updatedAt: now
		})
		.where(eq(pilotFieldState.pilotId, pilotId));
}

export async function hasPilotResourceStatReveal(
	db: DbExecutor,
	input: { pilotId: string; resourceInstanceId: string }
): Promise<boolean> {
	const [row] = await db
		.select({ id: pilotResourceStatReveals.id })
		.from(pilotResourceStatReveals)
		.where(
			and(
				eq(pilotResourceStatReveals.pilotId, input.pilotId),
				eq(pilotResourceStatReveals.resourceInstanceId, input.resourceInstanceId)
			)
		)
		.limit(1);

	return row !== undefined;
}

export async function listPilotRevealedResourceInstanceIds(
	db: DbExecutor,
	pilotId: string
): Promise<Set<string>> {
	const rows = await db
		.select({ resourceInstanceId: pilotResourceStatReveals.resourceInstanceId })
		.from(pilotResourceStatReveals)
		.where(eq(pilotResourceStatReveals.pilotId, pilotId));

	return new Set(rows.map((row) => row.resourceInstanceId));
}

export async function listPilotWaypointSamples(
	db: DbExecutor,
	input: { pilotId: string; bloomId: number }
) {
	return db
		.select({
			spotId: pilotDepositSpotSamples.spotId,
			resourceInstanceId: pilotDepositSpotSamples.resourceInstanceId,
			displayName: resourceInstances.displayName,
			resourceSlug: resourceInstances.resourceSlug,
			trueConcentrationPercent: pilotDepositSpotSamples.trueConcentrationPercent,
			samplesTaken: pilotDepositSpotSamples.samplesTaken
		})
		.from(pilotDepositSpotSamples)
		.innerJoin(
			resourceInstances,
			eq(pilotDepositSpotSamples.resourceInstanceId, resourceInstances.id)
		)
		.where(
			and(
				eq(pilotDepositSpotSamples.pilotId, input.pilotId),
				eq(resourceInstances.bloomId, input.bloomId)
			)
		);
}

/** Earliest Keth Iron waypoint sample — locked tutorial deploy target. */
export async function getTutorialLockedDeployTarget(
	db: DbExecutor,
	input: { pilotId: string; bloomId: number }
) {
	const [row] = await db
		.select({
			spotId: pilotDepositSpotSamples.spotId,
			resourceInstanceId: pilotDepositSpotSamples.resourceInstanceId,
			resourceSlug: resourceInstances.resourceSlug
		})
		.from(pilotDepositSpotSamples)
		.innerJoin(
			resourceInstances,
			eq(pilotDepositSpotSamples.resourceInstanceId, resourceInstances.id)
		)
		.where(
			and(
				eq(pilotDepositSpotSamples.pilotId, input.pilotId),
				eq(resourceInstances.bloomId, input.bloomId),
				eq(resourceInstances.resourceSlug, 'keth_iron')
			)
		)
		.orderBy(asc(pilotDepositSpotSamples.sampledAt))
		.limit(1);

	if (!row) {
		return null;
	}

	return {
		depositSpotId: row.spotId,
		resourceInstanceId: row.resourceInstanceId,
		resourceSlug: row.resourceSlug
	};
}
