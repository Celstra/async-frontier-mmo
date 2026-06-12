import {
	parseEventWindowSeverity,
	projectedRecoveryForStoredRun,
	resolveFirstSessionThumperRunResult,
	resolveThumperRunResult,
	TUTORIAL_RUN_SEED,
	type HullTier,
	type NamedResourceId,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse
} from '@async-frontier-mmo/domain';
import type { DbExecutor } from '../client.js';
import { getThumperEventWindowsForRun } from './thumperEventWindows.js';
import { getThumperRunPartSnapshots, partModifiersFromRunSnapshots } from './thumperRunParts.js';

type StoredRunRow = {
	id: string;
	targetResourceId: string;
	runSeed: string;
	isPushRun: boolean;
	trueConcentrationPercent: number | null;
	extractionTailMinutes: number;
	durationSeconds?: number;
	runHullIntegrity?: number;
};

function hullTierFromIntegrity(integrity: number): HullTier {
	if (integrity <= 10) {
		return 'scavenged';
	}
	if (integrity <= 35) {
		return 'patched';
	}
	return 'basic';
}

export function mapStoredWindowsToResolutionSnapshots(
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	return windows.map((window) => ({
		windowIndex: window.windowIndex,
		complication: window.complication as ThumperComplicationId,
		matchingAction: window.matchingAction as ThumperEventActionId,
		severity: parseEventWindowSeverity(window.severity)
	}));
}

export function mapStoredWindowsToResponses(
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	return windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));
}

/** Canonical claim-time resolver — includes stored severity on each window. */
export async function resolveThumperRunForStoredWindows(
	tx: DbExecutor,
	run: StoredRunRow,
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
	options?: { recoveryFloor?: number }
) {
	const responses = mapStoredWindowsToResponses(windows);
	const eventWindows = mapStoredWindowsToResolutionSnapshots(windows);
	const partSnapshots = await getThumperRunPartSnapshots(tx, run.id);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);
	const isTutorialRun = run.runSeed === TUTORIAL_RUN_SEED;
	const projectedRecovery = projectedRecoveryForStoredRun({
		isPushRun: run.isPushRun,
		trueConcentrationPercent: run.trueConcentrationPercent,
		extractionTailMinutes: run.extractionTailMinutes,
		isTutorialRun,
		partModifiers,
		recoveryFloor: options?.recoveryFloor
	});

	const runHullIntegrity = run.runHullIntegrity ?? 100;
	const plannedDurationSeconds =
		run.durationSeconds ?? run.extractionTailMinutes * 60 + 60;
	const hullConfig = {
		hullTier: hullTierFromIntegrity(runHullIntegrity),
		hullIntegrityAtDeploy: runHullIntegrity,
		plannedDurationSeconds
	};

	if (isTutorialRun) {
		return resolveFirstSessionThumperRunResult({
			targetResourceId: run.targetResourceId as NamedResourceId,
			appliedWear: 0,
			partModifiers,
			projectedRecovery,
			eventWindows,
			responses
		});
	}

	return resolveThumperRunResult({
		runConfig: {
			targetResourceId: run.targetResourceId as NamedResourceId,
			projectedRecovery,
			runSeed: run.runSeed,
			appliedWear: 0,
			partModifiers,
			recoveryFloor: options?.recoveryFloor,
			...hullConfig
		},
		eventWindows,
		responses
	});
}
