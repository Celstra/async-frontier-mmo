import {
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getPilotTutorialStep,
	getThumperEventWindowsForRun,
	getThumperRunPartSnapshots,
	getThumperRunResultForRun,
	listEconomyLedgerEntriesForPilot
} from '@async-frontier-mmo/db';
import {
	buildThumperClaimResultExplanation,
	effectiveThumperRunDurationSeconds,
	hullTierFromIntegrity,
	isHullFailsafeActive,
	resolveFirstAsyncWaiverActive,
	isThumperRunClaimable,
	isThumperRunReadyToResolve,
	resolveThumperState,
	TUTORIAL_RUN_1_SEED,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	TUTORIAL_RUN_2_SEED,
	TUTORIAL_RUN_2_YIELD,
	tutorialHullFailsafeClaimBanner,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';
import { loadFirstAsyncTailState } from './firstAsyncTailState.js';
import { resolveTargetDisplayName } from './targetResource.js';

function ledgerEntryRelatesToRun(
	payload: Record<string, unknown>,
	runId: string,
	resultId: string
): boolean {
	const sourceId = payload.source_id;
	if (sourceId === runId || sourceId === resultId) {
		return true;
	}
	if (payload.thumper_run_id === runId) {
		return true;
	}
	if (payload.source_type === 'thumper_run_result' && sourceId === resultId) {
		return true;
	}
	return false;
}

function pendingClaimMessage(input: {
	run: {
		id: string;
		deployedAt: Date;
		durationSeconds: number;
		runHullIntegrity?: number;
		extractionTailMinutes?: number;
	};
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>;
	now: Date;
	firstAsyncWaiverActive: boolean;
}): string {
	const runHullIntegrity = input.run.runHullIntegrity ?? 100;
	const hullConfig = {
		hullTier: hullTierFromIntegrity(runHullIntegrity),
		hullIntegrityAtDeploy: runHullIntegrity,
		plannedDurationSeconds: input.run.durationSeconds,
		extractionTailMinutes: input.run.extractionTailMinutes,
		firstAsyncWaiverActive: input.firstAsyncWaiverActive
	};

	if (isHullFailsafeActive(hullConfig)) {
		const hullOutReached =
			resolveThumperState({
				deployedAt: input.run.deployedAt,
				durationSeconds: effectiveThumperRunDurationSeconds(hullConfig),
				now: input.now
			}).status === 'claimable';

		if (!hullOutReached) {
			return 'Hull fail-safe active — wait for the rig to secure.';
		}
	}

	if (isThumperRunReadyToResolve(input.windows)) {
		return 'Thumper timer has not finished yet.';
	}

	return 'Resolve event windows on the Thumper Run screen before claiming.';
}

export async function loadClaimScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now: Date
) {
	const openRun = await getOpenThumperRunForPilot(db, pilotId);
	const latestRun = await getLatestThumperRunForPilot(db, pilotId);

	if (!latestRun && !openRun) {
		return { mode: 'none' as const };
	}

	const displayRun = latestRun?.claimedAt ? latestRun : openRun ?? latestRun;
	if (!displayRun) {
		return { mode: 'none' as const };
	}

	const tutorialStep = await getPilotTutorialStep(db, pilotId);
	const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });
	const firstAsyncWaiverActive = resolveFirstAsyncWaiverActive({
		hullTier: hullTierFromIntegrity(displayRun.runHullIntegrity ?? 100),
		hullIntegrityAtDeploy: displayRun.runHullIntegrity ?? 100,
		extractionTailMinutes: displayRun.extractionTailMinutes,
		firstAsyncUnlockPending: firstAsync.waiverPending,
		waiverRunId: firstAsync.waiverRunId,
		thumperRunId: displayRun.id
	});

	const targetDisplayName = await resolveTargetDisplayName(db, displayRun.targetResourceId);
	const windows = await getThumperEventWindowsForRun(db, displayRun.id);
	const thumperDemo = resolveThumperState({
		deployedAt: displayRun.deployedAt,
		durationSeconds: displayRun.durationSeconds,
		now
	});
	const runReadyToResolve = isThumperRunReadyToResolve(windows);
	const claimableByDomain = isThumperRunClaimable({
		run: displayRun,
		windows,
		now,
		firstAsyncWaiverActive
	});
	const claimable = !displayRun.claimedAt && claimableByDomain;

	const existingResult = displayRun.claimedAt
		? await getThumperRunResultForRun(db, displayRun.id)
		: null;

	if (existingResult?.acknowledgedAt) {
		return { mode: 'none' as const };
	}

	if (!existingResult && !claimable) {
		return {
			mode: 'pending' as const,
			targetDisplayName,
			thumperDemo,
			secondsRemaining: thumperDemo.status === 'active' ? thumperDemo.secondsRemaining : undefined,
			runReadyToResolve,
			message: pendingClaimMessage({ run: displayRun, windows, now, firstAsyncWaiverActive })
		};
	}

	if (!existingResult) {
		return {
			mode: 'claimable' as const,
			runId: displayRun.id,
			targetDisplayName,
			targetResourceId: displayRun.targetResourceId,
			thumperDemo,
			windowCount: windows.length,
			// Projected recovery would come from run meters, but we don't have them here
			// The UI will handle missing projectedRecovery gracefully
			projectedRecovery: undefined as number | undefined
		};
	}

	const partSnapshots = await getThumperRunPartSnapshots(db, displayRun.id);
	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	const explanation = buildThumperClaimResultExplanation({
		targetResourceDisplayName: targetDisplayName,
		projectedRecovery: existingResult.projectedRecovery,
		recoveredQuantity: existingResult.recoveredQuantity,
		wasteQuantity: existingResult.wasteQuantity,
		forfeitedRecovery: existingResult.forfeitedRecovery,
		resolutionType: existingResult.resolutionType as 'completed' | 'recalled',
		explanation: existingResult.explanation,
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses,
		partSnapshots,
		isPushRun: displayRun.isPushRun
	});

	const ledgerEntries = await listEconomyLedgerEntriesForPilot(db, pilotId);
	const auditEntries = ledgerEntries
		.filter((entry) =>
			ledgerEntryRelatesToRun(
				(entry.payload ?? {}) as Record<string, unknown>,
				displayRun.id,
				existingResult.id
			)
		)
		.map((entry) => ({
			id: entry.id,
			eventType: entry.eventType,
			quantityDelta: entry.quantityDelta,
			createdAt: entry.createdAt?.toISOString() ?? null,
			payload: entry.payload
		}));

	// Key on the run's seed rather than the tutorial step so the comparison line
	// renders even when the step has advanced to 'async_reveal' before the player
	// views the claim result.
	const tutorialComparisonLine =
		displayRun.runSeed === TUTORIAL_RUN_2_SEED
			? `Hand samples today: ~25u. Aborted run: ${TUTORIAL_RUN_1_YIELD_FLOOR}u. This run: ${TUTORIAL_RUN_2_YIELD}u.`
			: null;
	const tutorialRecallBannerLine =
		displayRun.runSeed === TUTORIAL_RUN_1_SEED &&
		existingResult.resolutionType === 'recalled'
			? tutorialHullFailsafeClaimBanner(existingResult.recoveredQuantity)
			: null;

	return {
		mode: 'result' as const,
		runId: displayRun.id,
		resultId: existingResult.id,
		targetDisplayName,
		targetResourceId: displayRun.targetResourceId,
		alreadyClaimed: true,
		claimResult: existingResult,
		explanation,
		auditEntries,
		tutorialComparisonLine,
		tutorialRecallBannerLine
	};
}
