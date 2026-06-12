import type { NamedResourceId } from '../resources/types.js';
import type { HullTier } from '../tuning.js';
import { assertRecallResponseAudit } from './assertRecallResponseAudit.js';
import type { EventWindowSeverity } from './eventWindowSeverity.js';
import { parseEventWindowSeverity } from './eventWindowSeverity.js';
import { computeHullFailsafeProrata, type HullFailsafeRecallReason } from './hullFailsafeRecall.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import {
	describeWindowResponse,
	penaltyWasteForResponse,
	RECALL_EXPLANATION_PREFIX
} from './thumperWindowResolution.js';

export type ThumperRunResolutionType = 'completed' | 'recalled';

export type ThumperRunConfig = {
	targetResourceId: NamedResourceId;
	projectedRecovery: number;
	/** Minimum recovered quantity after penalties (completed runs only). */
	recoveryFloor?: number;
	/** Stored for audit / future seeded generation; does not affect MVP tutorial math yet. */
	runSeed?: string;
	/** Wear already applied before resolution — recall must not erase it (MVP pass-through). */
	appliedWear?: number;
	/** From snapshotted thumper parts at deploy (Lesson 6.3). */
	partModifiers?: ThumperPartRunModifiers;
	/** Hull fail-safe inputs — when planned duration exceeds hull ceiling, yield is pro-rated. */
	hullTier?: HullTier;
	hullIntegrityAtDeploy?: number;
	plannedDurationSeconds?: number;
};

export type ThumperEventWindowSnapshot = {
	windowIndex: number;
	complication: ThumperComplicationId;
	/** Frozen at deploy — resolution must not recompute from current code maps. */
	matchingAction: ThumperEventActionId;
	/** Frozen at deploy — hold penalty scales with stored severity. */
	severity?: EventWindowSeverity;
};

export type ThumperWindowChosenResponse = ThumperEventActionId | 'hold' | 'recall_early';

export type ThumperEventWindowResponse = {
	windowIndex: number;
	complication: ThumperComplicationId;
	chosenResponse: ThumperWindowChosenResponse;
};

export type ThumperRunResult = {
	targetResourceId: NamedResourceId;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedRecovery: number;
	resolutionType: ThumperRunResolutionType;
	appliedWear: number;
	explanation: string;
	recallReason?: HullFailsafeRecallReason;
};

function findRecallWindowIndex(responses: ThumperEventWindowResponse[]): number | null {
	const recalls = responses.filter((response) => response.chosenResponse === 'recall_early');
	if (recalls.length > 1) {
		throw new Error('Only one Recall Early response is allowed per run');
	}
	return recalls[0]?.windowIndex ?? null;
}

function applyHullFailsafeToConfig(runConfig: ThumperRunConfig): {
	runConfig: ThumperRunConfig;
	recallReason?: HullFailsafeRecallReason;
} {
	if (
		runConfig.hullTier === undefined ||
		runConfig.hullIntegrityAtDeploy === undefined ||
		runConfig.plannedDurationSeconds === undefined
	) {
		return { runConfig };
	}

	const failsafe = computeHullFailsafeProrata({
		hullTier: runConfig.hullTier,
		hullIntegrityAtDeploy: runConfig.hullIntegrityAtDeploy,
		plannedDurationSeconds: runConfig.plannedDurationSeconds,
		projectedRecovery: runConfig.projectedRecovery
	});

	if (!failsafe.triggered) {
		return { runConfig };
	}

	return {
		runConfig: {
			...runConfig,
			projectedRecovery: failsafe.prorataProjectedRecovery
		},
		recallReason: failsafe.recallReason
	};
}

function resolveAnsweredWindows(input: {
	runConfig: ThumperRunConfig;
	eventWindows: ThumperEventWindowSnapshot[];
	responses: ThumperEventWindowResponse[];
	applyRecoveryFloor: boolean;
}): Omit<ThumperRunResult, 'resolutionType' | 'forfeitedRecovery' | 'recallReason'> {
	const { runConfig, eventWindows, responses, applyRecoveryFloor } = input;

	if (responses.length !== eventWindows.length) {
		throw new Error('Event window responses must match the planned window count');
	}

	const projectedRecovery = runConfig.projectedRecovery;

	let wasteQuantity = 0;
	const explanationParts: string[] = [];

	for (const response of responses) {
		if (response.chosenResponse === 'recall_early') {
			throw new Error('recall_early is not a complication response');
		}

		const window = eventWindows.find((row) => row.windowIndex === response.windowIndex);
		if (!window) {
			throw new Error(`No event window for index ${response.windowIndex}`);
		}
		if (window.complication !== response.complication) {
			throw new Error(
				`Window ${response.windowIndex} complication mismatch: expected ${window.complication}, got ${response.complication}`
			);
		}

		const { matchingAction } = window;

		const severity = parseEventWindowSeverity(window.severity);
		wasteQuantity += penaltyWasteForResponse(
			response.complication,
			matchingAction,
			response.chosenResponse,
			severity
		);

		explanationParts.push(
			describeWindowResponse(
				response.complication,
				matchingAction,
				response.chosenResponse
			)
		);
	}

	const partModifiers = runConfig.partModifiers;
	const rawRecovered = projectedRecovery - wasteQuantity;
	const adjustedRecovered =
		partModifiers === undefined
			? rawRecovered
			: Math.round(rawRecovered * partModifiers.performanceMultiplier) +
				partModifiers.pumpRecoveryBonus;
	const floor = applyRecoveryFloor ? (runConfig.recoveryFloor ?? 0) : 0;
	const recoveredQuantity = Math.max(floor, adjustedRecovered);

	if (partModifiers && partModifiers.pumpRecoveryBonus > 0) {
		explanationParts.push(
			`Pump recovery efficiency bonus +${partModifiers.pumpRecoveryBonus}.`
		);
	}
	if (partModifiers && partModifiers.performanceMultiplier < 1) {
		explanationParts.push(
			`Part condition reduced effective recovery (${Math.round(partModifiers.performanceMultiplier * 100)}%).`
		);
	}

	if (applyRecoveryFloor && runConfig.recoveryFloor !== undefined && rawRecovered < runConfig.recoveryFloor) {
		explanationParts.push(
			`Recovery floor applied: recovered at least ${runConfig.recoveryFloor}.`
		);
	}

	return {
		targetResourceId: runConfig.targetResourceId,
		projectedRecovery,
		recoveredQuantity,
		wasteQuantity,
		appliedWear: runConfig.appliedWear ?? 0,
		explanation: explanationParts.join(' ')
	};
}

/**
 * Resolve a thumper run from stored window rows and player responses.
 * Quantity and waste only — named resource stats stay immutable in the catalog.
 */
export function resolveThumperRunResult(input: {
	runConfig: ThumperRunConfig;
	eventWindows: ThumperEventWindowSnapshot[];
	responses: ThumperEventWindowResponse[];
}): ThumperRunResult {
	const hullAdjusted = applyHullFailsafeToConfig(input.runConfig);
	const runConfig = hullAdjusted.runConfig;
	const hullRecallReason = hullAdjusted.recallReason;

	assertRecallResponseAudit({ eventWindows: input.eventWindows, responses: input.responses });
	const recallWindowIndex = findRecallWindowIndex(input.responses);
	const appliedWear = runConfig.appliedWear ?? 0;

	if (recallWindowIndex === null && !hullRecallReason) {
		const result = resolveAnsweredWindows({
			runConfig,
			eventWindows: input.eventWindows,
			responses: input.responses,
			applyRecoveryFloor: true
		});

		return {
			...result,
			forfeitedRecovery: 0,
			resolutionType: 'completed'
		};
	}

	if (hullRecallReason && recallWindowIndex === null) {
		const hullDurationForfeit = Math.max(
			0,
			input.runConfig.projectedRecovery - runConfig.projectedRecovery
		);
		const answeredResponses = input.responses.filter(
			(response) => response.chosenResponse !== 'recall_early'
		);
		const securedWindows = input.eventWindows.filter((window) =>
			answeredResponses.some((response) => response.windowIndex === window.windowIndex)
		);
		const securedResponses = answeredResponses.filter((response) =>
			securedWindows.some((window) => window.windowIndex === response.windowIndex)
		);
		const failsafeSuffix = 'RIG SECURED — fail-safe nominal. Hull integrity spent.';

		if (securedWindows.length === 0) {
			return {
				targetResourceId: runConfig.targetResourceId,
				projectedRecovery: runConfig.projectedRecovery,
				recoveredQuantity:
					input.eventWindows.length === 0 ? runConfig.projectedRecovery : 0,
				wasteQuantity: 0,
				forfeitedRecovery: hullDurationForfeit,
				resolutionType: 'recalled',
				appliedWear,
				recallReason: hullRecallReason,
				explanation:
					input.eventWindows.length === 0
						? failsafeSuffix
						: `${RECALL_EXPLANATION_PREFIX} No windows were secured before hull fail-safe.`
			};
		}

		const skippedWindowCount = input.eventWindows.length - securedWindows.length;
		const windowForfeit =
			skippedWindowCount > 0
				? Math.round(
						(runConfig.projectedRecovery * skippedWindowCount) / input.eventWindows.length
					)
				: 0;

		const secured = resolveAnsweredWindows({
			runConfig: {
				...runConfig,
				projectedRecovery: runConfig.projectedRecovery - windowForfeit
			},
			eventWindows: securedWindows,
			responses: securedResponses,
			applyRecoveryFloor: false
		});

		return {
			...secured,
			projectedRecovery: runConfig.projectedRecovery,
			forfeitedRecovery: hullDurationForfeit + windowForfeit,
			resolutionType: 'recalled',
			appliedWear,
			recallReason: hullRecallReason,
			explanation:
				skippedWindowCount > 0
					? `${secured.explanation} ${failsafeSuffix}`
					: `${secured.explanation} ${failsafeSuffix}`
		};
	}

	const securedWindows = input.eventWindows.filter((window) => window.windowIndex < recallWindowIndex!);
	const securedResponses = input.responses.filter(
		(response) =>
			response.chosenResponse !== 'recall_early' && response.windowIndex < recallWindowIndex!
	);

	const skippedWindowCount = input.eventWindows.length - securedWindows.length;
	const forfeitedRecovery = Math.round(
		(runConfig.projectedRecovery * skippedWindowCount) / input.eventWindows.length
	);

	if (securedWindows.length === 0) {
		return {
			targetResourceId: runConfig.targetResourceId,
			projectedRecovery: runConfig.projectedRecovery,
			recoveredQuantity: 0,
			wasteQuantity: 0,
			forfeitedRecovery,
			resolutionType: 'recalled',
			appliedWear,
			recallReason: hullRecallReason,
			explanation: `${RECALL_EXPLANATION_PREFIX} No windows were secured before recall.`
		};
	}

	const secured = resolveAnsweredWindows({
		runConfig: {
			...runConfig,
			projectedRecovery: runConfig.projectedRecovery - forfeitedRecovery
		},
		eventWindows: securedWindows,
		responses: securedResponses,
		applyRecoveryFloor: false
	});

	return {
		...secured,
		projectedRecovery: runConfig.projectedRecovery,
		forfeitedRecovery,
		resolutionType: 'recalled',
		appliedWear,
		recallReason: hullRecallReason,
		explanation: `${secured.explanation} ${RECALL_EXPLANATION_PREFIX}`
	};
}
