import {
	applyRunWearToPartItems,
	claimOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getThumperRunPartSnapshots,
	partModifiersFromRunSnapshots
} from '@async-frontier-mmo/db';
import {
	assertVeyrithTutorialWindowsReady,
	FIRST_SESSION_SCANNER_MINIMUM,
	isThumperRunClaimable,
	projectedRecoveryForStoredRun,
	resolveFirstSessionThumperRunResult,
	resolveThumperRunResult,
	TUTORIAL_RUN_SEED,
	type NamedResourceId,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse
} from '@async-frontier-mmo/domain';
import { parseFrameId } from 'shared';
import type { getGameDb } from './gameDb.js';

async function buildTutorialClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
	run: {
		id: string;
		targetResourceId: string;
		pilotFrameId: string;
		isPushRun: boolean;
		trueConcentrationPercent: number | null;
		extractionTailMinutes: number;
	},
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as 'signal_drift' | 'pump_strain',
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	const partSnapshots = await getThumperRunPartSnapshots(tx, run.id);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);
	const projectedRecovery = projectedRecoveryForStoredRun({
		isPushRun: run.isPushRun,
		trueConcentrationPercent: run.trueConcentrationPercent,
		extractionTailMinutes: run.extractionTailMinutes,
		partModifiers,
		recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM
	});

	return resolveFirstSessionThumperRunResult({
		targetResourceId: run.targetResourceId as NamedResourceId,
		pilotFrame: parseFrameId(run.pilotFrameId),
		appliedWear: 0,
		partModifiers,
		projectedRecovery,
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as 'signal_drift' | 'pump_strain',
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses
	});
}

async function buildSeededClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
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

	return resolveThumperRunResult({
		runConfig: {
			targetResourceId: run.targetResourceId as NamedResourceId,
			projectedRecovery,
			runSeed: run.runSeed,
			appliedWear: 0,
			partModifiers
		},
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses,
		pilotFrame: parseFrameId(run.pilotFrameId)
	});
}

export async function claimOpenRun(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now: Date
) {
	return claimOpenThumperRunForPilot(db, {
		pilotId,
		now,
		isClaimable: (run, windows) => isThumperRunClaimable({ run, windows, now }),
		isResolvableRun: () => true,
		validateWindows: (run, windows) => {
			if (run.runSeed === TUTORIAL_RUN_SEED) {
				assertVeyrithTutorialWindowsReady(windows);
			}
		},
		buildResult: (tx, run, windows) =>
			run.runSeed === TUTORIAL_RUN_SEED
				? buildTutorialClaimResult(tx, run, windows)
				: buildSeededClaimResult(tx, run, windows),
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
