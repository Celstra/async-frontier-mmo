import {
	depositSpotCapacityUnits,
	generateDepositSpots,
	presentDepositSpotYield,
	resolveDepositSpot,
	type DepositSpotYieldBand,
	type NamedResourceId
} from '@async-frontier-mmo/domain';
import { eq, inArray, sql } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { depositSpotYields } from '../schema/depositSpotYields.js';

export type DepositSpotYieldState = {
	spotId: string;
	resourceInstanceId: string;
	capacityUnits: number;
	extractedUnits: number;
	remainingUnits: number;
	yieldBand: DepositSpotYieldBand;
	yieldBandLabel: string;
	exhaustedAt: Date | null;
};

export class DepositSpotExhaustedError extends Error {
	constructor(spotId: string) {
		super(`Deposit spot ${spotId} is exhausted`);
		this.name = 'DepositSpotExhaustedError';
	}
}

export class DepositSpotStaleError extends Error {
	constructor(spotId: string) {
		super(`Deposit spot ${spotId} belongs to a prior prospecting cycle`);
		this.name = 'DepositSpotStaleError';
	}
}

export const DEPOSIT_SPOT_DRAIN_ADJUSTMENT_PREFIX = 'The deposit ran dry — only ';

export function formatDepositSpotDrainAdjustment(grantedUnits: number): string {
	return `${DEPOSIT_SPOT_DRAIN_ADJUSTMENT_PREFIX}${grantedUnits} units were left to recover.`;
}

export function parseDepositSpotDrainAdjustment(explanation: string): string | null {
	const line = explanation
		.split('\n')
		.map((part) => part.trim())
		.find((part) => part.startsWith(DEPOSIT_SPOT_DRAIN_ADJUSTMENT_PREFIX));
	return line ?? null;
}

function toYieldState(row: {
	spotId: string;
	resourceInstanceId: string;
	unitsCapacity: number;
	unitsExtracted: number;
	exhaustedAt: Date | null;
}): DepositSpotYieldState {
	const presentation = presentDepositSpotYield({
		capacityUnits: row.unitsCapacity,
		extractedUnits: row.unitsExtracted
	});

	return {
		spotId: row.spotId,
		resourceInstanceId: row.resourceInstanceId,
		capacityUnits: row.unitsCapacity,
		extractedUnits: row.unitsExtracted,
		remainingUnits: presentation.remainingUnits,
		yieldBand: presentation.yieldBand,
		yieldBandLabel: presentation.yieldBandLabel,
		exhaustedAt: row.exhaustedAt
	};
}

function freshYieldState(input: {
	spotId: string;
	resourceInstanceId: string;
	generationSeed: string;
}): DepositSpotYieldState {
	const capacityUnits = depositSpotCapacityUnits({
		generationSeed: input.generationSeed,
		spotId: input.spotId
	});
	const presentation = presentDepositSpotYield({ capacityUnits, extractedUnits: 0 });

	return {
		spotId: input.spotId,
		resourceInstanceId: input.resourceInstanceId,
		capacityUnits,
		extractedUnits: 0,
		remainingUnits: presentation.remainingUnits,
		yieldBand: presentation.yieldBand,
		yieldBandLabel: presentation.yieldBandLabel,
		exhaustedAt: null
	};
}

/** Lazily create world-state row with domain-computed capacity. */
export async function ensureDepositSpotYieldRow(
	tx: DbExecutor,
	input: {
		spotId: string;
		resourceInstanceId: string;
		generationSeed: string;
	}
): Promise<DepositSpotYieldState> {
	const capacityUnits = depositSpotCapacityUnits({
		generationSeed: input.generationSeed,
		spotId: input.spotId
	});

	await tx
		.insert(depositSpotYields)
		.values({
			spotId: input.spotId,
			resourceInstanceId: input.resourceInstanceId,
			unitsCapacity: capacityUnits,
			unitsExtracted: 0
		})
		.onConflictDoNothing();

	const [row] = await tx
		.select()
		.from(depositSpotYields)
		.where(eq(depositSpotYields.spotId, input.spotId))
		.limit(1);

	if (!row) {
		throw new Error(`Failed to ensure deposit spot yield row for ${input.spotId}`);
	}

	return toYieldState(row);
}

export async function getDepositSpotYieldState(
	db: DbExecutor,
	input: {
		spotId: string;
		resourceInstanceId: string;
		generationSeed: string;
	}
): Promise<DepositSpotYieldState> {
	const [row] = await db
		.select()
		.from(depositSpotYields)
		.where(eq(depositSpotYields.spotId, input.spotId))
		.limit(1);

	if (!row) {
		return freshYieldState(input);
	}

	return toYieldState(row);
}

export async function loadDepositSpotYieldMap(
	db: DbExecutor,
	input: {
		spotIds: string[];
		resourceInstanceIdBySpotId: Readonly<Record<string, string>>;
		generationSeed: string;
	}
): Promise<Record<string, DepositSpotYieldState>> {
	if (input.spotIds.length === 0) {
		return {};
	}

	const rows = await db
		.select()
		.from(depositSpotYields)
		.where(inArray(depositSpotYields.spotId, input.spotIds));

	const rowBySpotId = new Map(rows.map((row) => [row.spotId, row]));
	const result: Record<string, DepositSpotYieldState> = {};

	for (const spotId of input.spotIds) {
		const row = rowBySpotId.get(spotId);
		const resourceInstanceId = input.resourceInstanceIdBySpotId[spotId];
		if (!resourceInstanceId) {
			continue;
		}

		result[spotId] = row
			? toYieldState(row)
			: freshYieldState({ spotId, resourceInstanceId, generationSeed: input.generationSeed });
	}

	return result;
}

export function yieldPresentationMap(
	states: Record<string, DepositSpotYieldState>
): Record<
	string,
	{
		capacityUnits: number;
		remainingUnits: number;
		yieldBand: DepositSpotYieldBand;
		yieldBandLabel: string;
	}
> {
	return Object.fromEntries(
		Object.entries(states).map(([spotId, state]) => [
			spotId,
			{
				capacityUnits: state.capacityUnits,
				remainingUnits: state.remainingUnits,
				yieldBand: state.yieldBand,
				yieldBandLabel: state.yieldBandLabel
			}
		])
	);
}

/** Reject deploy when spot id is stale or no units remain. */
export async function assertDepositSpotDeployable(
	tx: DbExecutor,
	input: {
		spotId: string;
		resourceInstanceId: string;
		generationSeed: string;
		resourceSlug: string;
		concentrationMinPercent: number;
		concentrationMaxPercent: number;
		prospectingCycle: number;
		allowExhausted?: boolean;
	}
): Promise<DepositSpotYieldState> {
	const currentSpot = resolveDepositSpot({
		spotId: input.spotId,
		resourceInstanceId: input.resourceInstanceId,
		resourceSlug: input.resourceSlug,
		bloomGenerationSeed: input.generationSeed,
		concentrationMinPercent: input.concentrationMinPercent,
		concentrationMaxPercent: input.concentrationMaxPercent,
		prospectingCycle: input.prospectingCycle
	});
	if (!currentSpot) {
		throw new DepositSpotStaleError(input.spotId);
	}

	const state = await ensureDepositSpotYieldRow(tx, input);
	if (state.remainingUnits <= 0 && !input.allowExhausted) {
		throw new DepositSpotExhaustedError(input.spotId);
	}
	return state;
}

export type DrainDepositSpotOnClaimResult = {
	grantedUnits: number;
	wasCapped: boolean;
	spotExhausted: boolean;
	adjustmentLine: string | null;
	yieldState: DepositSpotYieldState;
};

/**
 * Atomically drain a spot during claim — granted = min(requested, remaining).
 */
export async function drainDepositSpotOnClaim(
	tx: DbExecutor,
	input: {
		spotId: string;
		resourceInstanceId: string;
		generationSeed: string;
		requestedUnits: number;
		now: Date;
	}
): Promise<DrainDepositSpotOnClaimResult> {
	await ensureDepositSpotYieldRow(tx, input);

	if (input.requestedUnits <= 0) {
		const state = await getDepositSpotYieldState(tx, input);
		return {
			grantedUnits: 0,
			wasCapped: false,
			spotExhausted: state.remainingUnits <= 0,
			adjustmentLine: null,
			yieldState: state
		};
	}

	const result = await tx.execute<{
		spot_id: string;
		units_capacity: number;
		units_extracted: number;
		granted_units: number;
		exhausted_at: Date | null;
	}>(sql`
		WITH locked AS (
			SELECT spot_id, units_capacity, units_extracted
			FROM deposit_spot_yields
			WHERE spot_id = ${input.spotId}
			FOR UPDATE
		),
		grant_calc AS (
			SELECT
				spot_id,
				units_capacity,
				units_extracted AS old_extracted,
				LEAST(
					${input.requestedUnits},
					GREATEST(0, units_capacity - units_extracted)
				)::int AS grant_units
			FROM locked
		)
		UPDATE deposit_spot_yields AS d
		SET
			units_extracted = d.units_extracted + g.grant_units,
			exhausted_at = CASE
				WHEN d.units_extracted + g.grant_units >= d.units_capacity THEN ${input.now.toISOString()}::timestamptz
				ELSE d.exhausted_at
			END
		FROM grant_calc AS g
		WHERE d.spot_id = g.spot_id
		RETURNING
			d.spot_id,
			d.units_capacity,
			d.units_extracted,
			g.grant_units AS granted_units,
			d.exhausted_at
	`);

	const row = result[0];
	if (!row) {
		throw new Error(`Failed to drain deposit spot ${input.spotId}`);
	}

	const grantedUnits = Number(row.granted_units);
	const wasCapped = grantedUnits < input.requestedUnits;
	const spotExhausted = row.exhausted_at !== null;
	const yieldState = toYieldState({
		spotId: row.spot_id,
		resourceInstanceId: input.resourceInstanceId,
		unitsCapacity: Number(row.units_capacity),
		unitsExtracted: Number(row.units_extracted),
		exhaustedAt: row.exhausted_at
	});

	return {
		grantedUnits,
		wasCapped,
		spotExhausted,
		adjustmentLine: wasCapped ? formatDepositSpotDrainAdjustment(grantedUnits) : null,
		yieldState
	};
}

/** Test helper — set remaining units on a spot without a full extraction history. */
export async function seedDepositSpotRemainingUnits(
	db: DbExecutor,
	input: {
		spotId: string;
		resourceInstanceId: string;
		generationSeed: string;
		remainingUnits: number;
	}
): Promise<DepositSpotYieldState> {
	const capacityUnits = depositSpotCapacityUnits({
		generationSeed: input.generationSeed,
		spotId: input.spotId
	});
	const extractedUnits = Math.max(0, capacityUnits - input.remainingUnits);
	const exhaustedAt = input.remainingUnits <= 0 ? new Date() : null;

	await db
		.insert(depositSpotYields)
		.values({
			spotId: input.spotId,
			resourceInstanceId: input.resourceInstanceId,
			unitsCapacity: capacityUnits,
			unitsExtracted: extractedUnits,
			exhaustedAt
		})
		.onConflictDoUpdate({
			target: depositSpotYields.spotId,
			set: {
				unitsCapacity: capacityUnits,
				unitsExtracted: extractedUnits,
				exhaustedAt
			}
		});

	const [row] = await db
		.select()
		.from(depositSpotYields)
		.where(eq(depositSpotYields.spotId, input.spotId))
		.limit(1);

	return toYieldState(row);
}

/** Browser path smoke — clear drained shared-world Keth rows and re-seed full capacity. */
export async function resetKethIronDepositSpotsForSmoke(
	db: DbExecutor,
	input: {
		resourceInstanceId: string;
		generationSeed: string;
		resourceSlug: NamedResourceId;
		prospectingCycle: number;
		concentrationMinPercent: number;
		concentrationMaxPercent: number;
	}
): Promise<void> {
	await db
		.delete(depositSpotYields)
		.where(eq(depositSpotYields.resourceInstanceId, input.resourceInstanceId));

	const spots = generateDepositSpots({
		resourceSlug: input.resourceSlug,
		bloomGenerationSeed: input.generationSeed,
		concentrationMinPercent: input.concentrationMinPercent,
		concentrationMaxPercent: input.concentrationMaxPercent,
		prospectingCycle: input.prospectingCycle
	});

	for (const spot of spots) {
		const capacity = depositSpotCapacityUnits({
			generationSeed: input.generationSeed,
			spotId: spot.spotId
		});
		await seedDepositSpotRemainingUnits(db, {
			spotId: spot.spotId,
			resourceInstanceId: input.resourceInstanceId,
			generationSeed: input.generationSeed,
			remainingUnits: capacity
		});
	}
}
