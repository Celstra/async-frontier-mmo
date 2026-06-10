import {
	countFieldRepairKitsForPilot,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getThumperRunPartSnapshots,
	hasPilotCompletedTutorialThumper,
	partModifiersFromRunSnapshots
} from '@async-frontier-mmo/db';
import {
	buildActiveRunMeters,
	computeThumperPartRunModifiers,
	FIRST_SESSION_SCANNER_MINIMUM,
	frameFlavoredActionLabel,
	getEventWindowResponseOptions,
	isThumperRunReadyToResolve,
	resolveThumperState,
	TUTORIAL_RUN_SEED,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperPartSnapshot,
	type ThumperWindowChosenResponse,
	THUMPER_EVENT_ACTIONS,
	validateEventWindowRespondOrder,
	validateEventWindowResponse
} from '@async-frontier-mmo/domain';
import { parseFrameId, type FrameId } from 'shared';
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

export function mapEventWindowsForUi(
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
	fieldRepairKitCount: number,
	pilotFrameId: FrameId
) {
	return windows.map((window) => {
		const matchingAction = window.matchingAction as ThumperEventActionId;
		return {
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			matchingAction,
			matchingActionLabel: frameFlavoredActionLabel(pilotFrameId, matchingAction),
			chosenResponse: window.chosenResponse,
			responded: window.chosenResponse !== null,
			responseOptions: getEventWindowResponseOptions({
				complication: window.complication as ThumperComplicationId,
				matchingAction,
				fieldRepairKitCount
			})
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
	}
) {
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
	const pilotFrameId = parseFrameId(run.pilotFrameId);

	let runMeters = null;
	if (options?.includeRunMeters) {
		const equipped = await getEquippedThumperPartsForPilot(db, run.pilotId);
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
			partModifiers,
			surveyClarityScore: scanner?.propertyScores.survey_clarity ?? 0,
			equippedParts: {
				drill: partSummary(equipped.drill),
				pump: partSummary(equipped.pump),
				hull: partSummary(equipped.hull)
			},
			runHullCondition: run.runHullCondition,
			recoveryFloor: options.isTutorialRun ? FIRST_SESSION_SCANNER_MINIMUM : undefined
		});
	}

	return {
		thumperDemo,
		loadedAt: now.toISOString(),
		openRun: {
			id: run.id,
			targetResourceId: run.targetResourceId,
			targetDisplayName,
			pilotFrameId,
			runSeed: run.runSeed,
			isPushRun: run.isPushRun,
			recalled
		},
		eventWindows: mapEventWindowsForUi(eventWindowsRaw, fieldRepairKitCount, pilotFrameId),
		runHullCondition: run.runHullCondition,
		runHullIntegrity: run.runHullIntegrity,
		fieldRepairKitCount,
		runReadyToResolve: isThumperRunReadyToResolve(eventWindowsRaw),
		runMeters
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
	const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
		db,
		pilotId,
		TUTORIAL_RUN_SEED
	);
	const isTutorialRun = run.runSeed === TUTORIAL_RUN_SEED && !hasCompletedTutorial;

	return loadOpenRunState(db, run, fieldRepairKitCount, {
		resolveDisplayName,
		includeRunMeters: true,
		isTutorialRun
	});
}

export {
	validateEventWindowRespondOrder,
	validateEventWindowResponse
};
