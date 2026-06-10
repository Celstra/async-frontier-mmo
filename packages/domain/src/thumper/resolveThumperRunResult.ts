import type { FrameId } from 'shared';
import type { NamedResourceId } from '../resources/types.js';
import { assertRecallResponseAudit } from './assertRecallResponseAudit.js';
import { getFrameMatchingBonusRecovery } from './frameActionEffects.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';

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
};

export type ThumperEventWindowSnapshot = {
	windowIndex: number;
	complication: ThumperComplicationId;
	/** Frozen at deploy — resolution must not recompute from current code maps. */
	matchingAction: ThumperEventActionId;
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
};

const COMPLICATION_PENALTY_WASTE: Record<ThumperComplicationId, number> = {
	signal_drift: 10,
	hull_damage: 12,
	threat_surge: 12,
	pump_strain: 15
};

const RECALL_EXPLANATION_PREFIX =
	'Recall Early: secured progress kept; remaining projected recovery was not extracted.';

function penaltyWasteForResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>
): number {
	if (chosenResponse === matchingAction) {
		return 0;
	}

	return COMPLICATION_PENALTY_WASTE[complication];
}

function describeResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: Exclude<ThumperWindowChosenResponse, 'recall_early'>,
	frameBonus: number,
	pilotFrame: FrameId
): string {
	if (chosenResponse === matchingAction) {
		if (frameBonus > 0) {
			return `${complication}: used ${matchingAction} — ${pilotFrame} frame bonus +${frameBonus} recovery.`;
		}
		return `${complication}: used ${matchingAction} — no waste from this window.`;
	}
	if (chosenResponse === 'hold') {
		return `${complication}: held/ignored — extraction loss converted to waste.`;
	}
	return `${complication}: used ${chosenResponse} instead of ${matchingAction} — partial recovery loss.`;
}

function findRecallWindowIndex(responses: ThumperEventWindowResponse[]): number | null {
	const recalls = responses.filter((response) => response.chosenResponse === 'recall_early');
	if (recalls.length > 1) {
		throw new Error('Only one Recall Early response is allowed per run');
	}
	return recalls[0]?.windowIndex ?? null;
}

function resolveAnsweredWindows(input: {
	runConfig: ThumperRunConfig;
	eventWindows: ThumperEventWindowSnapshot[];
	responses: ThumperEventWindowResponse[];
	pilotFrame: FrameId;
	applyRecoveryFloor: boolean;
}): Omit<ThumperRunResult, 'resolutionType' | 'forfeitedRecovery'> {
	const { runConfig, eventWindows, responses, pilotFrame, applyRecoveryFloor } = input;

	if (responses.length !== eventWindows.length) {
		throw new Error('Event window responses must match the planned window count');
	}

	const projectedRecovery = runConfig.projectedRecovery;

	let wasteQuantity = 0;
	let frameBonusRecovery = 0;
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

		wasteQuantity += penaltyWasteForResponse(
			response.complication,
			matchingAction,
			response.chosenResponse
		);

		let windowFrameBonus = 0;
		if (response.chosenResponse === matchingAction) {
			windowFrameBonus = getFrameMatchingBonusRecovery(pilotFrame, matchingAction);
			frameBonusRecovery += windowFrameBonus;
		}

		explanationParts.push(
			describeResponse(
				response.complication,
				matchingAction,
				response.chosenResponse,
				windowFrameBonus,
				pilotFrame
			)
		);
	}

	const partModifiers = runConfig.partModifiers;
	const rawRecovered = projectedRecovery - wasteQuantity + frameBonusRecovery;
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
 * Resolve a thumper run from stored window rows, player responses, and pilot frame.
 * Quantity and waste only — named resource stats stay immutable in the catalog.
 */
export function resolveThumperRunResult(input: {
	runConfig: ThumperRunConfig;
	eventWindows: ThumperEventWindowSnapshot[];
	responses: ThumperEventWindowResponse[];
	pilotFrame: FrameId;
}): ThumperRunResult {
	const { runConfig, eventWindows, responses, pilotFrame } = input;
	assertRecallResponseAudit({ eventWindows, responses });
	const recallWindowIndex = findRecallWindowIndex(responses);
	const appliedWear = runConfig.appliedWear ?? 0;

	if (recallWindowIndex === null) {
		const result = resolveAnsweredWindows({
			runConfig,
			eventWindows,
			responses,
			pilotFrame,
			applyRecoveryFloor: true
		});

		return {
			...result,
			forfeitedRecovery: 0,
			resolutionType: 'completed'
		};
	}

	const securedWindows = eventWindows.filter((window) => window.windowIndex < recallWindowIndex);
	const securedResponses = responses.filter(
		(response) =>
			response.chosenResponse !== 'recall_early' && response.windowIndex < recallWindowIndex
	);

	const skippedWindowCount = eventWindows.length - securedWindows.length;
	const forfeitedRecovery = Math.round(
		(runConfig.projectedRecovery * skippedWindowCount) / eventWindows.length
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
		pilotFrame,
		applyRecoveryFloor: false
	});

	return {
		...secured,
		projectedRecovery: runConfig.projectedRecovery,
		forfeitedRecovery,
		resolutionType: 'recalled',
		appliedWear,
		explanation: `${secured.explanation} ${RECALL_EXPLANATION_PREFIX}`
	};
}
