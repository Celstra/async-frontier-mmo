import type { FrameId } from 'shared';
import type { NamedResourceId } from '../resources/types.js';
import { getFrameMatchingBonusRecovery } from './frameActionEffects.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';

export type ThumperRunConfig = {
	targetResourceId: NamedResourceId;
	projectedRecovery: number;
	/** Minimum recovered quantity after penalties (e.g. first-session scanner floor). */
	recoveryFloor?: number;
	/** Stored for audit / future seeded generation; does not affect MVP tutorial math yet. */
	runSeed?: string;
};

export type ThumperEventWindowSnapshot = {
	windowIndex: number;
	complication: ThumperComplicationId;
	/** Frozen at deploy — resolution must not recompute from current code maps. */
	matchingAction: ThumperEventActionId;
};

export type ThumperWindowChosenResponse = ThumperEventActionId | 'hold';

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
	explanation: string;
};

const COMPLICATION_PENALTY_WASTE: Record<ThumperComplicationId, number> = {
	signal_drift: 10,
	hull_damage: 12,
	threat_surge: 12,
	pump_strain: 15
};

function penaltyWasteForResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: ThumperWindowChosenResponse
): number {
	if (chosenResponse === matchingAction) {
		return 0;
	}

	return COMPLICATION_PENALTY_WASTE[complication];
}

function describeResponse(
	complication: ThumperComplicationId,
	matchingAction: ThumperEventActionId,
	chosenResponse: ThumperWindowChosenResponse,
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

	if (responses.length !== eventWindows.length) {
		throw new Error('Event window responses must match the planned window count');
	}

	const projectedRecovery = runConfig.projectedRecovery;
	let wasteQuantity = 0;
	let frameBonusRecovery = 0;
	const explanationParts: string[] = [];

	for (const response of responses) {
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

	const rawRecovered = projectedRecovery - wasteQuantity + frameBonusRecovery;
	const floor = runConfig.recoveryFloor ?? 0;
	const recoveredQuantity = Math.max(floor, rawRecovered);

	if (runConfig.recoveryFloor !== undefined && rawRecovered < runConfig.recoveryFloor) {
		explanationParts.push(
			`Recovery floor applied: recovered at least ${runConfig.recoveryFloor}.`
		);
	}

	return {
		targetResourceId: runConfig.targetResourceId,
		projectedRecovery,
		recoveredQuantity,
		wasteQuantity,
		explanation: explanationParts.join(' ')
	};
}
