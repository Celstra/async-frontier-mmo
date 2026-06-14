import {
	isTutorialRunSeed,
	rollEventWindowSeverity,
	PROSPECTING_CYCLE_SCATTER_LINE
} from '@async-frontier-mmo/domain';
import { and, eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { getBloomRecord } from './bloomRotation.js';
import {
	assertDepositSpotDeployable,
	drainDepositSpotOnClaim,
	formatDepositSpotDrainAdjustment
} from './depositSpotYields.js';

export { DepositSpotExhaustedError, DepositSpotStaleError } from './depositSpotYields.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { getThumperEventWindowsForRun, insertThumperEventWindows } from './thumperEventWindows.js';
import { snapshotEquippedPartsForRun } from './thumperRunParts.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import { getActiveBloomId, getResourceInstanceByBloomSlug, getResourceInstanceById, incrementResourceInstanceProspectingCycle } from './resourceInstances.js';
import {
	claimThumperRun,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	insertThumperRun
} from './thumperRuns.js';
import { getThumperRunResultForRun, insertThumperRunResult } from './thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { pilotFamilyScans } from '../schema/pilotFamilyScans.js';

export type ThumperRunResultPayload = {
	targetResourceId: string;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedRecovery: number;
	resolutionType: string;
	recallReason?: string;
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
	severity?: string;
	/** If true, this window is quiet and should NOT create a DB row. */
	quiet?: boolean;
};

async function bloomGenerationSeedForInstance(
	tx: DbExecutor,
	resourceInstance: { bloomId: number }
): Promise<string> {
	const bloom = await getBloomRecord(tx, resourceInstance.bloomId);
	return bloom?.generationSeed ?? `red-mesa-bloom-${resourceInstance.bloomId}`;
}

/** Insert run + event windows atomically. Rolls back the run if window insert fails. */
export async function deployThumperRunWithEventWindows(
	db: Db,
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
		windows: EventWindowSeed[];
		allowExhaustedSpot?: boolean;
	}
) {
	return db.transaction(async (tx: DbExecutor) => {
		const activeBloomId = await getActiveBloomId(tx);
		const targetInstance = input.resourceInstanceId
			? await getResourceInstanceById(tx, input.resourceInstanceId)
			: await getResourceInstanceByBloomSlug(tx, activeBloomId, input.targetResourceId);
		const resolvedResourceInstanceId = input.resourceInstanceId ?? targetInstance?.id ?? null;

		if (input.depositSpotId && resolvedResourceInstanceId && targetInstance) {
			const generationSeed = await bloomGenerationSeedForInstance(tx, targetInstance);
			await assertDepositSpotDeployable(tx, {
				spotId: input.depositSpotId,
				resourceInstanceId: resolvedResourceInstanceId,
				generationSeed,
				resourceSlug: targetInstance.resourceSlug,
				concentrationMinPercent: targetInstance.concentrationMinPercent,
				concentrationMaxPercent: targetInstance.concentrationMaxPercent,
				prospectingCycle: targetInstance.prospectingCycle,
				allowExhausted: input.allowExhaustedSpot ?? false
			});
		}

		const run = await insertThumperRun(tx, {
			pilotId: input.pilotId,
			targetResourceId: input.targetResourceId,
			runSeed: input.runSeed,
			isPushRun: input.isPushRun,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds,
			depositSpotId: input.depositSpotId ?? null,
			trueConcentrationPercent: input.trueConcentrationPercent ?? null,
			extractionTailMinutes: input.extractionTailMinutes ?? 60,
			resourceInstanceId: resolvedResourceInstanceId
		});

		// Only persist event windows (quiet: false or undefined). Quiet windows do NOT create DB rows.
		const eventWindows = input.windows.filter((w) => !w.quiet);
		if (eventWindows.length > 0) {
			await insertThumperEventWindows(tx, {
				thumperRunId: run.id,
				windows: eventWindows.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication,
					matchingAction: window.matchingAction,
					severity:
						window.severity ??
						rollEventWindowSeverity({
							runSeed: input.runSeed,
							windowIndex: window.windowIndex,
							forceMinor: isTutorialRunSeed(input.runSeed)
						})
				}))
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

		await appendEconomyLedgerEntry(tx, {
			eventType: 'thumper_deployed',
			pilotId: input.pilotId,
			quantityDelta: 0,
			payload: {
				source_type: 'thumper_run',
				source_id: run.id,
				target_resource_instance_id: resolvedResourceInstanceId ?? targetInstance?.id ?? null,
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
			run: {
				id: string;
				deployedAt: Date;
				durationSeconds: number;
				runHullIntegrity?: number;
				extractionTailMinutes: number;
			},
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => boolean;
		isResolvableRun: (run: { runSeed: string }) => boolean;
		notResolvableMessage?: string;
		validateWindows: (
			run: { id: string; targetResourceId: string; runSeed: string },
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => void;
		buildResult: (
			tx: DbExecutor,
			run: {
				id: string;
				targetResourceId: string;
				runSeed: string;
				isPushRun: boolean;
				trueConcentrationPercent: number | null;
				extractionTailMinutes: number;
			},
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => ThumperRunResultPayload | Promise<ThumperRunResultPayload>;
		/** When true, grants recovered quantity to the run's deployed resource instance in the same transaction. */
		grantResourceReward?: boolean;
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

		let resultPayload = await input.buildResult(tx, run, windows);

		// Scripted tutorial yields are pedagogical — not capped by shared-world spot drain.
		if (
			!isTutorialRunSeed(run.runSeed) &&
			run.depositSpotId &&
			run.resourceInstanceId &&
			resultPayload.recoveredQuantity > 0
		) {
			const resourceInstance = await getResourceInstanceById(tx, run.resourceInstanceId);
			if (resourceInstance) {
				const generationSeed = await bloomGenerationSeedForInstance(tx, resourceInstance);
				const drain = await drainDepositSpotOnClaim(tx, {
					spotId: run.depositSpotId,
					resourceInstanceId: run.resourceInstanceId,
					generationSeed,
					requestedUnits: resultPayload.recoveredQuantity,
					now: input.now
				});

				if (drain.grantedUnits !== resultPayload.recoveredQuantity) {
					const adjustmentLine =
						drain.adjustmentLine ?? formatDepositSpotDrainAdjustment(drain.grantedUnits);
					resultPayload = {
						...resultPayload,
						recoveredQuantity: drain.grantedUnits,
						explanation: resultPayload.explanation.includes(adjustmentLine)
							? resultPayload.explanation
							: `${resultPayload.explanation}\n\n${adjustmentLine}`
					};
				}
			}
		}

		if (run.depositSpotId && run.resourceInstanceId) {
			const resourceInstance = await getResourceInstanceById(tx, run.resourceInstanceId);
			if (resourceInstance) {
				await incrementResourceInstanceProspectingCycle(tx, run.resourceInstanceId);
				await tx
					.delete(pilotFamilyScans)
					.where(
						and(
							eq(pilotFamilyScans.pilotId, input.pilotId),
							eq(pilotFamilyScans.bloomId, resourceInstance.bloomId),
							eq(pilotFamilyScans.family, resourceInstance.family)
						)
					);

				if (!resultPayload.explanation.includes(PROSPECTING_CYCLE_SCATTER_LINE)) {
					resultPayload = {
						...resultPayload,
						explanation: `${resultPayload.explanation}\n\n${PROSPECTING_CYCLE_SCATTER_LINE}`
					};
				}
			}
		}

		const claimResult = await insertThumperRunResult(tx, {
			thumperRunId: run.id,
			targetResourceId: resultPayload.targetResourceId,
			projectedRecovery: resultPayload.projectedRecovery,
			recoveredQuantity: resultPayload.recoveredQuantity,
			wasteQuantity: resultPayload.wasteQuantity,
			forfeitedRecovery: resultPayload.forfeitedRecovery,
			resolutionType: resultPayload.resolutionType,
			recallReason: resultPayload.recallReason ?? null,
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
				resolution_type: resultPayload.resolutionType,
				deposit_spot_id: run.depositSpotId ?? null
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

			if (!run.resourceInstanceId) {
				throw new Error(`Thumper run ${run.id} has no deployed resource instance for claim reward`);
			}

			const resourceInstance = await getResourceInstanceById(tx, run.resourceInstanceId);
			if (!resourceInstance) {
				throw new Error(`Resource instance ${run.resourceInstanceId} not found for claim reward`);
			}

			if (resourceInstance.resourceSlug !== resultPayload.targetResourceId) {
				throw new Error(
					`Deployed instance slug ${resourceInstance.resourceSlug} does not match run target ${resultPayload.targetResourceId}`
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
