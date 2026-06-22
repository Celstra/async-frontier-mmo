import {
	effectiveThumperRunDurationSeconds,
	hullTierFromIntegrity,
	isProjectLedDefenseRun
} from '@async-frontier-mmo/domain';
import { and, desc, eq, isNotNull, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { getThumperEventWindowsForRun, recordThumperEventWindowResponse } from './thumperEventWindows.js';

export async function insertThumperRun(
	db: DbExecutor,
	input: {
		pilotId: string;
		targetResourceId: string;
		runSeed: string;
		isPushRun: boolean;
		deployedAt: Date;
		durationSeconds: number;
		depositSpotId?: string | null;
		trueConcentrationPercent?: number | null;
		extractionTailMinutes?: number;
		resourceInstanceId?: string | null;
		runMode?: string | null;
		projectSchematicId?: string | null;
		projectTargetSlotId?: string | null;
		projectTargetFamily?: string | null;
		projectNeedUnits?: number | null;
	}
) {
	const [row] = await db
		.insert(thumperRuns)
		.values({
			pilotId: input.pilotId,
			targetResourceId: input.targetResourceId,
			runSeed: input.runSeed,
			isPushRun: input.isPushRun,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds,
			depositSpotId: input.depositSpotId ?? null,
			trueConcentrationPercent: input.trueConcentrationPercent ?? null,
			extractionTailMinutes: input.extractionTailMinutes ?? 60,
			resourceInstanceId: input.resourceInstanceId ?? null,
			runMode: input.runMode ?? null,
			projectSchematicId: input.projectSchematicId ?? null,
			projectTargetSlotId: input.projectTargetSlotId ?? null,
			projectTargetFamily: input.projectTargetFamily ?? null,
			projectNeedUnits: input.projectNeedUnits ?? null
		})
		.returning();

	return row;
}

export async function getLatestThumperRunForPilot(db: DbExecutor, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, pilotId))
		.orderBy(desc(thumperRuns.deployedAt))
		.limit(1);

	return row ?? null;
}

export async function getOpenThumperRunForPilot(db: DbExecutor, pilotId: string) {
	const [row] = await db
		.select()
		.from(thumperRuns)
		.where(and(eq(thumperRuns.pilotId, pilotId), isNull(thumperRuns.claimedAt)))
		.limit(1);

	return row ?? null;
}

function fastForwardDeployedAtForRun(
	openRun: NonNullable<Awaited<ReturnType<typeof getOpenThumperRunForPilot>>>
): Date {
	return new Date(
		Date.now() -
			(Math.max(
				openRun.durationSeconds,
				effectiveThumperRunDurationSeconds({
					hullTier: hullTierFromIntegrity(openRun.runHullIntegrity ?? 100),
					hullIntegrityAtDeploy: openRun.runHullIntegrity ?? 100,
					plannedDurationSeconds: openRun.durationSeconds,
					extractionTailMinutes: openRun.extractionTailMinutes
				})
			) +
				120) *
				1000
	);
}

/** Test/smoke helper — rewind deployedAt so the run timer has elapsed (does not answer windows). */
export async function fastForwardOpenThumperRunTimerOnly(db: DbExecutor, pilotId: string) {
	const openRun = await getOpenThumperRunForPilot(db, pilotId);
	if (!openRun) {
		throw new Error(`No open thumper run for pilot ${pilotId}`);
	}

	await db
		.update(thumperRuns)
		.set({ deployedAt: fastForwardDeployedAtForRun(openRun) })
		.where(eq(thumperRuns.id, openRun.id));
}

/** Test/smoke helper — rewind deployedAt to a specific timer progress without answering windows. */
export async function fastForwardOpenThumperRunToProgress(
	db: DbExecutor,
	pilotId: string,
	progressPercent: number
) {
	const openRun = await getOpenThumperRunForPilot(db, pilotId);
	if (!openRun) {
		throw new Error(`No open thumper run for pilot ${pilotId}`);
	}

	const clampedProgress = Math.max(0, Math.min(100, progressPercent));
	const elapsedSeconds = Math.floor(openRun.durationSeconds * (clampedProgress / 100));
	await db
		.update(thumperRuns)
		.set({ deployedAt: new Date(Date.now() - elapsedSeconds * 1000) })
		.where(eq(thumperRuns.id, openRun.id));
}

/** Test/smoke helper — answer open windows and rewind deployedAt so claim is allowed. */
export async function fastForwardOpenThumperRunToClaimable(db: DbExecutor, pilotId: string) {
	const openRun = await getOpenThumperRunForPilot(db, pilotId);
	if (!openRun) {
		throw new Error(`No open thumper run for pilot ${pilotId}`);
	}

	if (isProjectLedDefenseRun(openRun.runMode)) {
		await fastForwardOpenThumperRunTimerOnly(db, pilotId);
		return;
	}

	const windows = await getThumperEventWindowsForRun(db, openRun.id);
	for (const window of windows) {
		if (window.chosenResponse === null) {
			await recordThumperEventWindowResponse(db, {
				thumperRunId: openRun.id,
				windowIndex: window.windowIndex,
				chosenResponse: window.matchingAction
			});
		}
	}

	await fastForwardOpenThumperRunTimerOnly(db, pilotId);
}

export async function getClaimedTutorialRunDeployTarget(
	db: DbExecutor,
	input: { pilotId: string; runSeed: string }
) {
	const [row] = await db
		.select({
			depositSpotId: thumperRuns.depositSpotId,
			resourceInstanceId: thumperRuns.resourceInstanceId
		})
		.from(thumperRuns)
		.where(
			and(
				eq(thumperRuns.pilotId, input.pilotId),
				eq(thumperRuns.runSeed, input.runSeed),
				isNotNull(thumperRuns.claimedAt)
			)
		)
		.orderBy(desc(thumperRuns.deployedAt))
		.limit(1);

	return row ?? null;
}

/**
 * Like {@link getClaimedTutorialRunDeployTarget} but returns the most recent run
 * regardless of claim state — used as a fallback when run-1 expired unclaimed.
 */
export async function getAnyTutorialRunDeployTarget(
	db: DbExecutor,
	input: { pilotId: string; runSeed: string }
) {
	const [row] = await db
		.select({
			depositSpotId: thumperRuns.depositSpotId,
			resourceInstanceId: thumperRuns.resourceInstanceId
		})
		.from(thumperRuns)
		.where(
			and(eq(thumperRuns.pilotId, input.pilotId), eq(thumperRuns.runSeed, input.runSeed))
		)
		.orderBy(desc(thumperRuns.deployedAt))
		.limit(1);

	return row ?? null;
}

export async function hasPilotClaimedTutorialRun(
	db: DbExecutor,
	pilotId: string,
	tutorialRunSeed: string
) {
	const [row] = await db
		.select({ id: thumperRuns.id })
		.from(thumperRuns)
		.where(
			and(
				eq(thumperRuns.pilotId, pilotId),
				eq(thumperRuns.runSeed, tutorialRunSeed),
				isNotNull(thumperRuns.claimedAt)
			)
		)
		.limit(1);

	return row !== undefined;
}

/** @deprecated Use {@link hasPilotClaimedTutorialRun} with the run seed. */
export async function hasPilotCompletedTutorialThumper(
	db: DbExecutor,
	pilotId: string,
	tutorialRunSeed: string
) {
	return hasPilotClaimedTutorialRun(db, pilotId, tutorialRunSeed);
}

export async function claimThumperRun(db: DbExecutor, id: string, claimedAt: Date) {
	const [row] = await db
		.update(thumperRuns)
		.set({ claimedAt })
		.where(and(eq(thumperRuns.id, id), isNull(thumperRuns.claimedAt)))
		.returning();

	return row ?? null;
}
