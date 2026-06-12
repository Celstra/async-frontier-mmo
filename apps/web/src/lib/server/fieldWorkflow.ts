import {
	applyRunWearToPartItems,
	claimOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getPilotTutorialStep,
	getThumperRunPartSnapshots,
	partModifiersFromRunSnapshots
} from '@async-frontier-mmo/db';
import {
	hullTierFromIntegrity,
	isThumperRunClaimable,
	projectedRecoveryForStoredRun,
	resolveTutorialThumperRunResult,
	tutorialRunFromSeed,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	type NamedResourceId,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse
} from '@async-frontier-mmo/domain';
import { resolveThumperRunResult } from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';
import {
	firstAsyncWaiverActiveForRun,
	loadFirstAsyncTailState
} from './firstAsyncTailState.js';

type ClaimRunRow = {
	id: string;
	targetResourceId: string;
	runSeed?: string;
	isPushRun: boolean;
	trueConcentrationPercent: number | null;
	extractionTailMinutes: number;
	durationSeconds?: number;
	runHullIntegrity?: number;
};

async function buildTutorialClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
	run: ClaimRunRow & { runSeed: string },
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	const tutorialRun = tutorialRunFromSeed(run.runSeed);
	if (tutorialRun === null) {
		throw new Error(`Unknown tutorial run seed: ${run.runSeed}`);
	}

	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	const partSnapshots = await getThumperRunPartSnapshots(tx, run.id);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);
	const projectedRecovery = projectedRecoveryForStoredRun({
		isPushRun: run.isPushRun,
		trueConcentrationPercent: run.trueConcentrationPercent,
		extractionTailMinutes: run.extractionTailMinutes,
		isTutorialRun: true,
		partModifiers,
		recoveryFloor: tutorialRun === 1 ? TUTORIAL_RUN_1_YIELD_FLOOR : undefined
	});

	return resolveTutorialThumperRunResult({
		tutorialRun,
		targetResourceId: run.targetResourceId as NamedResourceId,
		appliedWear: 0,
		partModifiers,
		projectedRecovery,
		hullIntegrityAtDeploy: run.runHullIntegrity,
		plannedDurationSeconds: run.durationSeconds,
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses
	});
}

async function buildSeededClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
	run: ClaimRunRow & { runSeed: string },
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
	firstAsync: Awaited<ReturnType<typeof loadFirstAsyncTailState>>
) {
	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	const partSnapshots = await getThumperRunPartSnapshots(tx, run.id);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);
	const projectedRecovery = projectedRecoveryForStoredRun({
		isPushRun: run.isPushRun,
		trueConcentrationPercent: run.trueConcentrationPercent,
		extractionTailMinutes: run.extractionTailMinutes,
		partModifiers
	});

	const runHullIntegrity = run.runHullIntegrity ?? 100;
	const plannedDurationSeconds = run.durationSeconds ?? run.extractionTailMinutes * 60 + 60;
	const firstAsyncWaiverActive = firstAsyncWaiverActiveForRun({
		hullIntegrity: runHullIntegrity,
		extractionTailMinutes: run.extractionTailMinutes,
		thumperRunId: run.id,
		firstAsync
	});
	return resolveThumperRunResult({
		runConfig: {
			targetResourceId: run.targetResourceId as NamedResourceId,
			projectedRecovery,
			runSeed: run.runSeed,
			appliedWear: 0,
			partModifiers,
			hullTier: hullTierFromIntegrity(runHullIntegrity),
			hullIntegrityAtDeploy: runHullIntegrity,
			plannedDurationSeconds,
			extractionTailMinutes: run.extractionTailMinutes,
			firstAsyncWaiverActive
		},
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses
	});
}

export async function claimOpenRun(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now: Date
) {
	const tutorialStep = await getPilotTutorialStep(db, pilotId);
	const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });

	return claimOpenThumperRunForPilot(db, {
		pilotId,
		now,
		isClaimable: (run, windows) =>
			isThumperRunClaimable({
				run,
				windows,
				now,
				firstAsyncWaiverActive: firstAsyncWaiverActiveForRun({
					hullIntegrity: run.runHullIntegrity ?? 100,
					extractionTailMinutes: run.extractionTailMinutes,
					thumperRunId: run.id,
					firstAsync
				})
			}),
		isResolvableRun: () => true,
		validateWindows: () => {},
		buildResult: (tx, run, windows) =>
			tutorialRunFromSeed(run.runSeed) !== null
				? buildTutorialClaimResult(tx, run as ClaimRunRow & { runSeed: string }, windows)
				: buildSeededClaimResult(
						tx,
						run as ClaimRunRow & { runSeed: string },
						windows,
						firstAsync
					),
		afterResultInserted: async (tx, { run, windows }) => {
			const snapshots = await getThumperRunPartSnapshots(tx, run.id);
			const responses = windows
				.filter((window) => window.chosenResponse !== null)
				.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication,
					chosenResponse: window.chosenResponse!
				}));
			await applyRunWearToPartItems(tx, {
				pilotId: run.pilotId,
				thumperRunId: run.id,
				snapshots,
				responses,
				isPushRun: run.isPushRun
			});
		},
		grantResourceReward: true
	});
}
