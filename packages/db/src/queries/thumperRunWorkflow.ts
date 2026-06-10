import { eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { getThumperEventWindowsForRun, insertThumperEventWindows } from './thumperEventWindows.js';
import { snapshotEquippedPartsForRun } from './thumperRunParts.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import { getActiveBloomId, getResourceInstanceByBloomSlug } from './resourceInstances.js';
import {
	claimThumperRun,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	insertThumperRun
} from './thumperRuns.js';
import { getThumperRunResultForRun, insertThumperRunResult } from './thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export type ThumperRunResultPayload = {
	targetResourceId: string;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedRecovery: number;
	resolutionType: string;
	appliedWear: number;
	explanation: string;
};

export type ClaimResourceReward = {
	resourceInstanceId: string;
	resourceSlug: string;
	displayName: string;
	quantityGranted: number;
	stackQuantity: number;
};

export type ClaimThumperRunOutcome =
	| {
			status: 'claimed';
			claimResult: Awaited<ReturnType<typeof insertThumperRunResult>> | null;
			reward: ClaimResourceReward | null;
	  }
	| {
			status: 'already_claimed';
			claimResult: Awaited<ReturnType<typeof getThumperRunResultForRun>>;
			reward: null;
	  }
	| { status: 'no_open_run' }
	| { status: 'not_claimable' }
	| { status: 'not_resolvable'; message: string }
	| { status: 'invalid_windows'; message: string };

type EventWindowSeed = {
	windowIndex: number;
	complication: string;
	matchingAction: string;
};

/** Insert run + event windows atomically. Rolls back the run if window insert fails. */
export async function deployThumperRunWithEventWindows(
	db: Db,
	input: {
		pilotId: string;
		pilotFrameId: string;
		targetResourceId: string;
		runSeed: string;
		isPushRun: boolean;
		deployedAt: Date;
		durationSeconds: number;
		depositSpotId?: string | null;
		trueConcentrationPercent?: number | null;
		extractionTailMinutes?: number;
		resourceInstanceId?: string | null;
		windows: EventWindowSeed[];
	}
) {
	return db.transaction(async (tx: DbExecutor) => {
		const run = await insertThumperRun(tx, {
			pilotId: input.pilotId,
			pilotFrameId: input.pilotFrameId,
			targetResourceId: input.targetResourceId,
			runSeed: input.runSeed,
			isPushRun: input.isPushRun,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds,
			depositSpotId: input.depositSpotId ?? null,
			trueConcentrationPercent: input.trueConcentrationPercent ?? null,
			extractionTailMinutes: input.extractionTailMinutes ?? 60,
			resourceInstanceId: input.resourceInstanceId ?? null
		});

		if (input.windows.length > 0) {
			await insertThumperEventWindows(tx, {
				thumperRunId: run.id,
				windows: input.windows
			});
		}

		const partSnapshots = await snapshotEquippedPartsForRun(tx, {
			thumperRunId: run.id,
			pilotId: input.pilotId
		});

		const hull = partSnapshots.find((part) => part.slot === 'hull');
		if (hull) {
			await tx
				.update(thumperRuns)
				.set({
					runHullCondition: hull.condition,
					runHullIntegrity: hull.integrity
				})
				.where(eq(thumperRuns.id, run.id));
		}

		const activeBloomId = await getActiveBloomId(tx);
		const targetInstance = await getResourceInstanceByBloomSlug(
			tx,
			activeBloomId,
			input.targetResourceId
		);

		await appendEconomyLedgerEntry(tx, {
			eventType: 'thumper_deployed',
			pilotId: input.pilotId,
			quantityDelta: 0,
			payload: {
				source_type: 'thumper_run',
				source_id: run.id,
				target_resource_instance_id: targetInstance?.id ?? null,
				deposit_spot_id: input.depositSpotId ?? null,
				true_concentration_percent: input.trueConcentrationPercent ?? null,
				extraction_tail_minutes: input.extractionTailMinutes ?? 60,
				run_seed: input.runSeed,
				is_push_run: input.isPushRun,
				duration_seconds: input.durationSeconds
			},
			createdAt: input.deployedAt
		});

		return run;
	});
}

/**
 * Claim gate: conditional claimed_at update must win before result insert.
 * Duplicate claim returns existing result without inserting again.
 */
export async function claimOpenThumperRunForPilot(
	db: Db,
	input: {
		pilotId: string;
		now: Date;
		isClaimable: (
			run: { deployedAt: Date; durationSeconds: number },
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => boolean;
		isResolvableRun: (run: { runSeed: string }) => boolean;
		notResolvableMessage?: string;
		validateWindows: (
			run: { id: string; targetResourceId: string; pilotFrameId: string; runSeed: string },
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => void;
		buildResult: (
			tx: DbExecutor,
			run: {
				id: string;
				targetResourceId: string;
				pilotFrameId: string;
				runSeed: string;
				isPushRun: boolean;
				trueConcentrationPercent: number | null;
				extractionTailMinutes: number;
			},
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => ThumperRunResultPayload | Promise<ThumperRunResultPayload>;
		/** When set, grants recovered quantity to the bloom resource instance in the same transaction. */
		grantResourceReward?: { bloomId: number };
		/** After result row is inserted — e.g. apply part wear to item rows. */
		afterResultInserted?: (
			tx: DbExecutor,
			ctx: {
				run: typeof thumperRuns.$inferSelect;
				windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>;
				claimResult: NonNullable<Awaited<ReturnType<typeof insertThumperRunResult>>>;
			}
		) => Promise<void>;
	}
): Promise<ClaimThumperRunOutcome> {
	return db.transaction(async (tx: DbExecutor) => {
		const run = await getOpenThumperRunForPilot(tx, input.pilotId);
		if (!run) {
			const latest = await getLatestThumperRunForPilot(tx, input.pilotId);
			if (latest?.claimedAt) {
				const existingResult = await getThumperRunResultForRun(tx, latest.id);
				return { status: 'already_claimed', claimResult: existingResult, reward: null };
			}

			return { status: 'no_open_run' };
		}

		const windows = await getThumperEventWindowsForRun(tx, run.id);

		if (!input.isClaimable(run, windows)) {
			return { status: 'not_claimable' };
		}

		if (!input.isResolvableRun(run)) {
			return {
				status: 'not_resolvable',
				message:
					input.notResolvableMessage ??
					'This run type cannot be resolved yet'
			};
		}

		try {
			input.validateWindows(run, windows);
		} catch (error) {
			return {
				status: 'invalid_windows',
				message: error instanceof Error ? error.message : 'Invalid event windows'
			};
		}

		const claimedRun = await claimThumperRun(tx, run.id, input.now);
		if (!claimedRun) {
			const [currentRun] = await tx
				.select()
				.from(thumperRuns)
				.where(eq(thumperRuns.id, run.id))
				.limit(1);
			const existingResult = await getThumperRunResultForRun(tx, run.id);

			if (currentRun?.claimedAt) {
				return { status: 'already_claimed', claimResult: existingResult, reward: null };
			}

			return { status: 'no_open_run' };
		}

		const resultPayload = await input.buildResult(tx, run, windows);
		const claimResult = await insertThumperRunResult(tx, {
			thumperRunId: run.id,
			targetResourceId: resultPayload.targetResourceId,
			projectedRecovery: resultPayload.projectedRecovery,
			recoveredQuantity: resultPayload.recoveredQuantity,
			wasteQuantity: resultPayload.wasteQuantity,
			forfeitedRecovery: resultPayload.forfeitedRecovery,
			resolutionType: resultPayload.resolutionType,
			appliedWear: resultPayload.appliedWear,
			explanation: resultPayload.explanation,
			resolvedAt: input.now
		});

		await appendEconomyLedgerEntry(tx, {
			eventType: 'thumper_claimed',
			pilotId: input.pilotId,
			quantityDelta: 0,
			payload: {
				source_type: 'thumper_run',
				source_id: run.id,
				recovered_quantity: resultPayload.recoveredQuantity,
				resolution_type: resultPayload.resolutionType
			},
			createdAt: input.now
		});

		if (input.afterResultInserted) {
			await input.afterResultInserted(tx, { run, windows, claimResult });
		}

		let reward: ClaimResourceReward | null = null;
		if (input.grantResourceReward && resultPayload.recoveredQuantity > 0) {
			if (resultPayload.targetResourceId !== run.targetResourceId) {
				throw new Error(
					`Result target ${resultPayload.targetResourceId} does not match run target ${run.targetResourceId}`
				);
			}

			const resourceInstance = await getResourceInstanceByBloomSlug(
				tx,
				input.grantResourceReward.bloomId,
				resultPayload.targetResourceId
			);
			if (!resourceInstance) {
				throw new Error(
					`No resource instance for bloom ${input.grantResourceReward.bloomId} slug ${resultPayload.targetResourceId}`
				);
			}

			const stack = await grantResourceToPilotTx(tx, {
				pilotId: input.pilotId,
				resourceInstanceId: resourceInstance.id,
				quantity: resultPayload.recoveredQuantity,
				source: { type: 'thumper_run_result', id: claimResult.id }
			});

			reward = {
				resourceInstanceId: resourceInstance.id,
				resourceSlug: resourceInstance.resourceSlug,
				displayName: resourceInstance.displayName,
				quantityGranted: resultPayload.recoveredQuantity,
				stackQuantity: stack.quantity
			};
		}

		return { status: 'claimed', claimResult, reward };
	});
}
