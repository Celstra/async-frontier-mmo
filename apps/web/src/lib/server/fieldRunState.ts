import {
	countFieldRepairKitsForPilot,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getThumperRunPartSnapshots,
	partModifiersFromRunSnapshots
} from '@async-frontier-mmo/db';
import {
	buildActiveRunMeters,
	buildGearYieldPenaltySummary,
	computeThumperPartRunModifiers,
	describeEventWindowStakes,
	effectiveThumperRunDurationSeconds,
	hullTierFromIntegrity,
	isHullFailsafeActive,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	formatEventWindowOutcomeLine,
	generateSeededThumperEventWindows,
	generateThumperEventWindows,
	overallThumperCondition,
	parseEventWindowSeverity,
	eventActionLabel,
	getEventWindowResponseOptions,
	isThumperRunReadyToResolve,
	resolveThumperState,
	tutorialRunFromSeed,
	tutorialRunSeed,
	type EventWindowMeterSnapshot,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperPartSnapshot,
	type ThumperWindowChosenResponse,
	THUMPER_EVENT_ACTIONS,
	validateEventWindowRespondOrder,
	validateEventWindowResponse
} from '@async-frontier-mmo/domain';
import type { NamedResourceId } from '@async-frontier-mmo/domain';
import type { FirstAsyncTailState } from './firstAsyncTailState.js';
import { firstAsyncWaiverActiveForRun } from './firstAsyncTailState.js';
import type { getGameDb } from './gameDb.js';

export function parseWindowIndex(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string') {
		return null;
	}
	const index = Number.parseInt(value, 10);
	return Number.isInteger(index) && index > 0 ? index : null;
}

export function parseChosenResponse(
	value: FormDataEntryValue | null
): ThumperWindowChosenResponse | null {
	if (value === 'hold' || value === 'recall_early') {
		return value;
	}
	if (typeof value === 'string' && THUMPER_EVENT_ACTIONS.includes(value as ThumperEventActionId)) {
		return value as ThumperEventActionId;
	}
	return null;
}

export function isRunEndedByRecall(
	windows: ReadonlyArray<{ chosenResponse: string | null }>
): boolean {
	return windows.some((window) => window.chosenResponse === 'recall_early');
}

function partSummary(
	part: {
		displayName: string;
		condition: number;
		integrity: number;
	} | null
) {
	if (!part) return null;
	return {
		displayName: part.displayName,
		condition: part.condition,
		integrity: part.integrity
	};
}

function equippedPartSnapshots(
	equipped: Awaited<ReturnType<typeof getEquippedThumperPartsForPilot>>
): ThumperPartSnapshot[] {
	const snapshots: ThumperPartSnapshot[] = [];
	for (const slot of ['drill', 'pump', 'hull'] as const) {
		const part = equipped[slot];
		if (!part) continue;
		snapshots.push({
			slot,
			itemId: part.id,
			schematicId: part.schematicId,
			displayName: part.displayName,
			propertyScores: part.propertyScores,
			condition: part.condition,
			integrity: part.integrity
		});
	}
	return snapshots;
}

function parseMeterSnapshot(value: unknown): EventWindowMeterSnapshot | null {
	if (!value || typeof value !== 'object') {
		return null;
	}
	const row = value as Record<string, unknown>;
	if (
		typeof row.projectedRecovery !== 'number' ||
		typeof row.signalLock !== 'number' ||
		typeof row.pumpFlow !== 'number' ||
		typeof row.threatPressure !== 'number' ||
		typeof row.hullCondition !== 'number'
	) {
		return null;
	}
	const snapshot: EventWindowMeterSnapshot = {
		projectedRecovery: row.projectedRecovery,
		signalLock: row.signalLock,
		pumpFlow: row.pumpFlow,
		threatPressure: row.threatPressure,
		hullCondition: row.hullCondition
	};
	if (row.severity === 'minor' || row.severity === 'serious') {
		snapshot.severity = row.severity;
	}
	return snapshot;
}

export function currentRunMetersFromWindows(
	deployMeters: EventWindowMeterSnapshot,
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
): EventWindowMeterSnapshot {
	const responded = windows
		.filter((window) => window.afterState !== null)
		.sort((left, right) => left.windowIndex - right.windowIndex);
	if (responded.length === 0) {
		return deployMeters;
	}
	const latest = responded[responded.length - 1]!;
	const parsed = parseMeterSnapshot(latest.afterState);
	return parsed ?? deployMeters;
}

export type EventWindowForUi = {
	windowIndex: number;
	quiet: boolean;
	complication?: ThumperComplicationId;
	matchingAction?: ThumperEventActionId;
	severity?: 'minor' | 'serious';
	matchingActionLabel?: string;
	chosenResponse: string | null;
	responded: boolean;
	responseOptions: Array<{
		id: string;
		label: string;
		enabled: boolean;
		disabledReason?: string;
		effectLine: string;
		projected?: import('@async-frontier-mmo/domain').EventWindowProjectedMetrics;
	}>;
	outcomeLine: string | null;
	quietMessage?: string;
};

export function mapEventWindowsForUi(
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
	fieldRepairKitCount: number,
	deployMeters: EventWindowMeterSnapshot,
	// For non-tutorial runs, we regenerate the full plan to include quiet windows
	runSeed?: string,
	isPushRun?: boolean,
	targetResourceId?: NamedResourceId,
	tutorialRun?: 1 | 2,
	extractionTailMinutes?: number
): EventWindowForUi[] {
	// Build lookup map of stored event windows
	const storedWindows = new Map(windows.map((w) => [w.windowIndex, w]));

	// Regenerate full plan to include quiet windows (deterministic from seed)
	let fullPlan: Array<
		| { windowIndex: number; quiet: true }
		| {
				windowIndex: number;
				quiet: false;
				complication: ThumperComplicationId;
				matchingAction: ThumperEventActionId;
				severity: 'minor' | 'serious';
		  }
	>;

	if (tutorialRun && targetResourceId) {
		// Tutorial: regenerate from plan (no quiet windows)
		const tutorial = generateThumperEventWindows({
			targetResourceId,
			runSeed: tutorialRunSeed(tutorialRun),
			isPushRun: false,
			tutorialRun
		});
		fullPlan = tutorial.windows.map((w) =>
			w.quiet
				? { windowIndex: w.windowIndex, quiet: true }
				: {
						windowIndex: w.windowIndex,
						quiet: false,
						complication: w.complication,
						matchingAction: w.matchingAction,
						severity: w.severity
					}
		);
	} else if (runSeed && targetResourceId) {
		// Seeded run: regenerate full plan including quiet windows
		const seeded = generateSeededThumperEventWindows({
			runSeed,
			targetResourceId,
			isPushRun: isPushRun ?? false,
			extractionTailMinutes
		});
		fullPlan = seeded.windows.map((w) =>
			w.quiet
				? { windowIndex: w.windowIndex, quiet: true }
				: {
						windowIndex: w.windowIndex,
						quiet: false,
						complication: w.complication,
						matchingAction: w.matchingAction,
						severity: w.severity
					}
		);
	} else {
		// Fallback: just use stored windows (no quiet windows shown)
		fullPlan = windows.map((w) => ({
			windowIndex: w.windowIndex,
			quiet: false as const,
			complication: w.complication as ThumperComplicationId,
			matchingAction: w.matchingAction as ThumperEventActionId,
			severity: parseEventWindowSeverity(w.severity)
		}));
	}

	const totalWindowCount = fullPlan.length;

	return fullPlan.map((plannedWindow) => {
		// Handle quiet windows
		if (plannedWindow.quiet) {
			return {
				windowIndex: plannedWindow.windowIndex,
				quiet: true,
				chosenResponse: null,
				// Quiet windows never create DB rows — they auto-pass and must not block later events.
				responded: true,
				responseOptions: [],
				outcomeLine: null,
				quietMessage: 'All quiet — the thumper hums along, no action needed'
			};
		}

		// Event window
		const window = storedWindows.get(plannedWindow.windowIndex);
		const matchingAction = plannedWindow.matchingAction;
		const complication = plannedWindow.complication;

		// Get all previous windows (from stored + plan) for meter calculation
		const previousStored = windows.filter((row) => row.windowIndex < plannedWindow.windowIndex);
		const metersForWindow = currentRunMetersFromWindows(deployMeters, previousStored);

		const severity = plannedWindow.severity;
		const stakes = describeEventWindowStakes({
			complication,
			matchingAction,
			severity,
			fieldRepairKitCount,
			currentMeters: metersForWindow,
			windowIndex: plannedWindow.windowIndex,
			totalWindowCount,
			tutorialDeterministic: tutorialRun !== undefined
		});

		const beforeState = parseMeterSnapshot(window?.beforeState);
		const afterState = parseMeterSnapshot(window?.afterState);
		const outcomeLine =
			window?.chosenResponse && beforeState && afterState
				? formatEventWindowOutcomeLine({
						complication,
						matchingAction,
						chosenResponse: window.chosenResponse as ThumperWindowChosenResponse,
						beforeState,
						afterState
					})
				: null;

		return {
			windowIndex: plannedWindow.windowIndex,
			quiet: false,
			complication,
			matchingAction,
			severity,
			matchingActionLabel: eventActionLabel(matchingAction),
			chosenResponse: window?.chosenResponse ?? null,
			responded: window?.chosenResponse !== null && window?.chosenResponse !== undefined,
		responseOptions: getEventWindowResponseOptions({
			complication,
			matchingAction,
			fieldRepairKitCount
		}).map((option) => {
			const stake = stakes.find((s) => s.id === option.id);
			// Map kind to display label
			const label =
				option.id === 'hold'
					? 'Hold'
					: option.id === 'recall_early'
						? 'Recall Early'
						: eventActionLabel(option.id as ThumperEventActionId);
			return {
				id: option.id,
				label,
				enabled: option.enabled,
				disabledReason: option.disabledReason,
				effectLine: stake?.effectLine ?? '',
				projected: stake?.projected
			};
		}),
		outcomeLine
	};
	});
}

export async function loadOpenRunState(
	db: ReturnType<typeof getGameDb>,
	run: NonNullable<Awaited<ReturnType<typeof getOpenThumperRunForPilot>>>,
	fieldRepairKitCount: number,
	options?: {
		resolveDisplayName?: (
			db: ReturnType<typeof getGameDb>,
			targetResourceId: string
		) => Promise<string>;
		includeRunMeters?: boolean;
		isTutorialRun?: boolean;
		firstAsync?: FirstAsyncTailState;
	}
) {
	const tutorialRun = tutorialRunFromSeed(run.runSeed);
	const isTutorialRun = tutorialRun !== null;
	const firstAsyncWaiverActive =
		options?.firstAsync !== undefined
			? firstAsyncWaiverActiveForRun({
					hullIntegrity: run.runHullIntegrity ?? 100,
					extractionTailMinutes: run.extractionTailMinutes,
					thumperRunId: run.id,
					firstAsync: options.firstAsync
				})
			: false;
	const hullFailsafeInput = {
		hullTier: hullTierFromIntegrity(run.runHullIntegrity ?? 100),
		hullIntegrityAtDeploy: run.runHullIntegrity ?? 100,
		plannedDurationSeconds: run.durationSeconds,
		extractionTailMinutes: run.extractionTailMinutes,
		firstAsyncWaiverActive
	};
	const now = new Date();
	const thumperDemo = resolveThumperState({
		deployedAt: run.deployedAt,
		durationSeconds: run.durationSeconds,
		now
	});
	const targetDisplayName = options?.resolveDisplayName
		? await options.resolveDisplayName(db, run.targetResourceId)
		: run.targetResourceId;
	const eventWindowsRaw = await getThumperEventWindowsForRun(db, run.id);
	const recalled = isRunEndedByRecall(eventWindowsRaw);
	let runMeters = null;
	let overallCondition = null;
	let gearYieldPenalty = null;
	let drillCondition: number | null = null;
	let pumpCondition: number | null = null;
	if (options?.includeRunMeters) {
		const equipped = await getEquippedThumperPartsForPilot(db, run.pilotId);
		drillCondition = equipped.drill?.condition ?? null;
		pumpCondition = equipped.pump?.condition ?? null;
		const scanner = await getEquippedScannerForPilot(db, run.pilotId);
		const partSnapshots = await getThumperRunPartSnapshots(db, run.id);
		const partModifiers =
			partSnapshots.length > 0
				? partModifiersFromRunSnapshots(partSnapshots)
				: computeThumperPartRunModifiers(equippedPartSnapshots(equipped));

		runMeters = buildActiveRunMeters({
			trueConcentrationPercent: run.trueConcentrationPercent ?? 67,
			extractionTailMinutes: run.extractionTailMinutes,
			isPushRun: run.isPushRun,
			isTutorialRun,
			partModifiers,
			surveyClarityScore: scanner?.propertyScores.survey_clarity ?? 0,
			equippedParts: {
				drill: partSummary(equipped.drill),
				pump: partSummary(equipped.pump),
				hull: partSummary(equipped.hull)
			},
			runHullCondition: run.runHullCondition,
			recoveryFloor: tutorialRun === 1 ? TUTORIAL_RUN_1_YIELD_FLOOR : undefined
		});

		gearYieldPenalty = buildGearYieldPenaltySummary({
			isPushRun: run.isPushRun,
			trueConcentrationPercent: run.trueConcentrationPercent ?? 67,
			extractionTailMinutes: run.extractionTailMinutes,
			isTutorialRun,
			partModifiers,
			recoveryFloor: tutorialRun === 1 ? TUTORIAL_RUN_1_YIELD_FLOOR : undefined
		});

		// Calculate overall thumper condition from equipped parts
		overallCondition = overallThumperCondition({
			drill: equipped.drill
				? {
						...equippedPartSnapshots({ drill: equipped.drill, pump: null, hull: null })[0]!,
						slot: 'drill'
					}
				: undefined,
			pump: equipped.pump
				? {
						...equippedPartSnapshots({ drill: null, pump: equipped.pump, hull: null })[0]!,
						slot: 'pump'
					}
				: undefined,
			hull: equipped.hull
				? {
						...equippedPartSnapshots({ drill: null, pump: null, hull: equipped.hull })[0]!,
						slot: 'hull'
					}
				: undefined
		});
	}

	const deployMeters = runMeters;
	const displayMeters =
		deployMeters === null
			? null
			: currentRunMetersFromWindows(deployMeters, eventWindowsRaw);

	return {
		thumperDemo,
		loadedAt: now.toISOString(),
		runDurationSeconds: run.durationSeconds,
		openRun: {
			id: run.id,
			targetResourceId: run.targetResourceId,
			targetDisplayName,
			runSeed: run.runSeed,
			isPushRun: run.isPushRun,
			recalled
		},
		eventWindows: mapEventWindowsForUi(
			eventWindowsRaw,
			fieldRepairKitCount,
			deployMeters ?? {
				projectedRecovery: 0,
				signalLock: 0,
				pumpFlow: 0,
				threatPressure: 0,
				hullCondition: run.runHullCondition
			},
			run.runSeed,
			run.isPushRun,
			run.targetResourceId as NamedResourceId,
			tutorialRun ?? undefined,
			run.extractionTailMinutes
		),
		runHullCondition: run.runHullCondition,
		runHullIntegrity: run.runHullIntegrity,
		fieldRepairKitCount,
		runReadyToResolve: isThumperRunReadyToResolve(eventWindowsRaw),
		runMeters: displayMeters,
		overallThumperCondition: overallCondition,
		drillCondition,
		pumpCondition,
		gearYieldPenalty,
		effectiveDurationSeconds: effectiveThumperRunDurationSeconds(hullFailsafeInput),
		failsafeActive: isHullFailsafeActive(hullFailsafeInput)
	};
}

export async function loadThumperRunScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	resolveDisplayName: (
		db: ReturnType<typeof getGameDb>,
		targetResourceId: string
	) => Promise<string>
) {
	const run = await getOpenThumperRunForPilot(db, pilotId);
	if (!run) {
		return null;
	}

	const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);

	return loadOpenRunState(db, run, fieldRepairKitCount, {
		resolveDisplayName,
		includeRunMeters: true
	});
}

export {
	validateEventWindowRespondOrder,
	validateEventWindowResponse
};
