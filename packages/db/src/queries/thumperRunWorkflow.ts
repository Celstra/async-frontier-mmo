import {
	isTutorialRunSeed,
	rollEventWindowSeverity,
	PROSPECTING_CYCLE_SCATTER_LINE,
	isProjectLedDefenseRun,
	isProjectLedCommandQueueRun,
	isDefenseRunEnded,
	type ThumperPartSlot,
	type ThumperPartWearDelta
} from '@async-frontier-mmo/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { getBloomRecord } from './bloomRotation.js';
import {
	assertDepositSpotDeployable,
	drainDepositSpotOnClaim,
	formatDepositSpotDrainAdjustment,
	getDepositSpotYieldState
} from './depositSpotYields.js';

export { DepositSpotExhaustedError, DepositSpotStaleError } from './depositSpotYields.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { getPilotDepositSample } from './prospecting.js';
import { getThumperEventWindowsForRun, insertThumperEventWindows } from './thumperEventWindows.js';
import {
	applyRunWearToPartItems,
	applyDefenseWearToPartItems,
	getThumperRunPartSnapshots,
	snapshotEquippedPartsForRun
} from './thumperRunParts.js';
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
import { markPilotProjectMaterialSecured } from './projectTargets.js';
import { replayDefenseRunForStoredRun } from './thumperDefenseRuns.js';
import { assertCommandQueueRunClaimable } from './thumperCommandQueueRuns.js';

export const PROJECT_LED_DEFENSE_RUN_MODE = 'project_led_defense' as const;
export const PROJECT_LED_COMMAND_QUEUE_RUN_MODE = 'project_led_command_queue' as const;

/** @deprecated Pressure-menu watched runs retired 2026-06-20. */
export const PROJECT_LED_WATCHED_RUN_MODE = 'project_led_watched' as const;

export type ProjectLedRunContext = {
	runMode: typeof PROJECT_LED_DEFENSE_RUN_MODE | typeof PROJECT_LED_COMMAND_QUEUE_RUN_MODE;
	schematicId: string;
	targetSlotId: string;
	targetFamily: string;
	projectNeedUnits: number;
};

export class ResourceInstanceExpiredError extends Error {
	constructor(resourceInstanceId: string) {
		super(`Resource instance ${resourceInstanceId} is expired`);
		this.name = 'ResourceInstanceExpiredError';
	}
}

export class ResourceInstanceInactiveBloomError extends Error {
	constructor(resourceInstanceId: string, bloomId: number, activeBloomId: number) {
		super(
			`Resource instance ${resourceInstanceId} belongs to bloom ${bloomId}, not active bloom ${activeBloomId}`
		);
		this.name = 'ResourceInstanceInactiveBloomError';
	}
}

function assertResourceInstanceDeployable(input: {
	resourceInstanceId: string;
	bloomId: number;
	extinctAt: Date | null;
	activeBloomId: number;
	deployedAt: Date;
}) {
	if (input.extinctAt && input.extinctAt <= input.deployedAt) {
		throw new ResourceInstanceExpiredError(input.resourceInstanceId);
	}
	if (input.bloomId !== input.activeBloomId) {
		throw new ResourceInstanceInactiveBloomError(
			input.resourceInstanceId,
			input.bloomId,
			input.activeBloomId
		);
	}
}

export class ResourceInstanceNotFoundError extends Error {
	constructor(public readonly resourceInstanceId: string) {
		super(`Resource instance ${resourceInstanceId} not found`);
		this.name = 'ResourceInstanceNotFoundError';
	}
}

export class PilotSampleRequiredError extends Error {
	constructor(message = 'Deploy requires a persisted sample on this deposit spot') {
		super(message);
		this.name = 'PilotSampleRequiredError';
	}
}

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
	resourceStackId: string;
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
		/** Decision 025 — reject deploy unless pilot has a persisted sample row for this spot. */
		requirePilotSample?: boolean;
		/** Decision 025 — snapshot project-led context onto the run at deploy time. */
		projectRunContext?: ProjectLedRunContext;
	}
) {
	return db.transaction(async (tx: DbExecutor) => {
		const activeBloomId = await getActiveBloomId(tx);
		let targetInstance;
		if (input.resourceInstanceId) {
			targetInstance = await getResourceInstanceById(tx, input.resourceInstanceId);
			if (!targetInstance) {
				throw new ResourceInstanceNotFoundError(input.resourceInstanceId);
			}
		} else {
			targetInstance = await getResourceInstanceByBloomSlug(tx, activeBloomId, input.targetResourceId);
			if (!targetInstance) {
				throw new ResourceInstanceNotFoundError(input.targetResourceId);
			}
		}
		const resolvedResourceInstanceId = targetInstance.id;

		assertResourceInstanceDeployable({
			resourceInstanceId: resolvedResourceInstanceId,
			bloomId: targetInstance.bloomId,
			extinctAt: targetInstance.extinctAt,
			activeBloomId,
			deployedAt: input.deployedAt
		});

		if (input.depositSpotId) {
			if (input.requirePilotSample) {
				const sample = await getPilotDepositSample(tx, {
					pilotId: input.pilotId,
					resourceInstanceId: resolvedResourceInstanceId,
					spotId: input.depositSpotId
				});
				if (!sample) {
					throw new PilotSampleRequiredError();
				}
			}

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
			resourceInstanceId: resolvedResourceInstanceId,
			runMode: input.projectRunContext?.runMode ?? null,
			projectSchematicId: input.projectRunContext?.schematicId ?? null,
			projectTargetSlotId: input.projectRunContext?.targetSlotId ?? null,
			projectTargetFamily: input.projectRunContext?.targetFamily ?? null,
			projectNeedUnits: input.projectRunContext?.projectNeedUnits ?? null
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
				deployedAt: Date;
				trueConcentrationPercent: number | null;
				extractionTailMinutes: number;
				durationSeconds?: number;
			},
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
			now?: Date
		) => ThumperRunResultPayload | Promise<ThumperRunResultPayload>;
		/** When true, grants recovered quantity to the run's deployed resource instance in the same transaction. */
		grantResourceReward?: boolean;
		/** Decision 025 — keep sampled spots redeployable; skip prospecting cycle scatter. */
		skipProspectingCycleScatter?: boolean;
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

		if (isProjectLedCommandQueueRun(run.runMode)) {
			const replay = await assertCommandQueueRunClaimable(tx, {
				id: run.id,
				runSeed: run.runSeed,
				defenseActionLog: run.defenseActionLog,
				commandQueueLength: run.commandQueueLength
			});
			if (replay.status !== 'ended') {
				return { status: 'not_claimable' };
			}
		} else if (isProjectLedDefenseRun(run.runMode)) {
			const defenseState = await replayDefenseRunForStoredRun(tx, run, input.now);
			if (!isDefenseRunEnded(defenseState)) {
				return { status: 'not_claimable' };
			}
		} else {
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

		let resultPayload = await input.buildResult(tx, run, windows, input.now);

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

		if (
			!input.skipProspectingCycleScatter &&
			run.runMode !== PROJECT_LED_DEFENSE_RUN_MODE &&
			run.runMode !== PROJECT_LED_COMMAND_QUEUE_RUN_MODE &&
			run.runMode !== PROJECT_LED_WATCHED_RUN_MODE &&
			run.depositSpotId &&
			run.resourceInstanceId
		) {
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

		let partWearDeltas: Record<ThumperPartSlot, ThumperPartWearDelta> | null = null;
		if (!claimedRun.partWearAppliedAt) {
			const snapshots = await getThumperRunPartSnapshots(tx, run.id);
			let wearOutcome;
			if (isProjectLedDefenseRun(run.runMode)) {
				const defenseSummary = (
					resultPayload as {
						defenseSummary?: {
							endingCondition: Record<'drill' | 'pump' | 'hull', number>;
						};
					}
				).defenseSummary;
				if (!defenseSummary) {
					throw new Error(`Defense summary missing for run ${run.id}`);
				}
				wearOutcome = await applyDefenseWearToPartItems(tx, {
					pilotId: input.pilotId,
					thumperRunId: run.id,
					snapshots,
					endingCondition: defenseSummary.endingCondition
				});
			} else {
				const responses = windows
					.filter((window) => window.chosenResponse !== null)
					.map((window) => ({
						windowIndex: window.windowIndex,
						complication: window.complication,
						chosenResponse: window.chosenResponse!
					}));
				wearOutcome = await applyRunWearToPartItems(tx, {
					pilotId: input.pilotId,
					thumperRunId: run.id,
					snapshots,
					responses,
					isPushRun: run.isPushRun
				});
			}
			partWearDeltas = wearOutcome.wearDeltas;
			resultPayload = {
				...resultPayload,
				appliedWear: wearOutcome.appliedWear
			};

			await tx
				.update(thumperRuns)
				.set({ partWearAppliedAt: input.now })
				.where(and(eq(thumperRuns.id, run.id), isNull(thumperRuns.partWearAppliedAt)));
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
			partWearDeltas,
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
				stackQuantity: stack.quantity,
				resourceStackId: stack.id
			};

			if (
				(isProjectLedDefenseRun(run.runMode) ||
					isProjectLedCommandQueueRun(run.runMode) ||
					run.runMode === PROJECT_LED_WATCHED_RUN_MODE) &&
				run.projectSchematicId &&
				run.projectTargetSlotId &&
				run.projectTargetFamily
			) {
				const projectNeedUnits = run.projectNeedUnits ?? 0;
				if (projectNeedUnits > 0 && stack.quantity >= projectNeedUnits) {
					let spotRemainingUnits = 0;
					if (run.depositSpotId) {
						const generationSeed = await bloomGenerationSeedForInstance(tx, resourceInstance);
						const yieldState = await getDepositSpotYieldState(tx, {
							spotId: run.depositSpotId,
							resourceInstanceId: resourceInstance.id,
							generationSeed
						});
						spotRemainingUnits = yieldState.remainingUnits;
					}

					await markPilotProjectMaterialSecured(tx, {
						pilotId: input.pilotId,
						now: input.now,
						runSnapshot: {
							schematicId: run.projectSchematicId,
							targetSlotId: run.projectTargetSlotId,
							targetFamily: run.projectTargetFamily
						},
						evidence: {
							claimResultId: claimResult.id,
							resourceStackId: stack.id,
							crossingClaimQuantity: resultPayload.recoveredQuantity,
							securedStackQuantity: stack.quantity,
							projectNeedUnits,
							spotRemainingUnits
						}
					});
				}
			}
		}

		return { status: 'claimed', claimResult, reward };
	});
}
