import type { FrameId } from 'shared';
import type { ActiveRunMeterPreview } from './deployPreview.js';
import { eventActionLabel } from './eventActionLabels.js';
import { getFrameMatchingBonusRecovery } from './frameActionEffects.js';
import type { ThumperWindowResponseOptionId } from './getEventWindowResponseOptions.js';
import { getEventWindowResponseOptions } from './getEventWindowResponseOptions.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type { ThumperWindowChosenResponse } from './resolveThumperRunResult.js';
import {
	COMPLICATION_PENALTY_WASTE,
	penaltyWasteForResponse
} from './thumperWindowResolution.js';

export type EventWindowMeterSnapshot = ActiveRunMeterPreview;

type PrimaryMeterKey = 'signalLock' | 'pumpFlow' | 'threatPressure' | 'hullCondition';

const COMPLICATION_PRIMARY_METER: Record<ThumperComplicationId, PrimaryMeterKey> = {
	signal_drift: 'signalLock',
	hull_damage: 'hullCondition',
	threat_surge: 'threatPressure',
	pump_strain: 'pumpFlow'
};

/** Meter shift when a complication window opens (player sees this before choosing). */
export const COMPLICATION_METER_ONSET: Record<ThumperComplicationId, number> = {
	signal_drift: -28,
	hull_damage: -20,
	threat_surge: 22,
	pump_strain: -25
};

/** Matching action restores the onset meter change (inverse sign for threat pressure). */
export const COMPLICATION_METER_MATCHING_RESTORE: Record<ThumperComplicationId, number> = {
	signal_drift: 28,
	hull_damage: 20,
	threat_surge: -22,
	pump_strain: 25
};

const FRAME_DISPLAY: Record<FrameId, string> = {
	recon: 'Recon',
	engineer: 'Engineer',
	vanguard: 'Vanguard'
};

function clampMeter(value: number): number {
	return Math.max(0, Math.min(100, Math.round(value)));
}

function applyMeterDelta(meters: EventWindowMeterSnapshot, key: PrimaryMeterKey, delta: number) {
	return {
		...meters,
		[key]: clampMeter(meters[key] + delta)
	};
}

/** Forfeited projected recovery when Recall Early is chosen at this window index. */
export function computeRecallForfeitedRecovery(input: {
	projectedRecovery: number;
	recallWindowIndex: number;
	totalWindowCount: number;
}): number {
	const securedCount = input.recallWindowIndex - 1;
	const skippedWindowCount = input.totalWindowCount - securedCount;
	return Math.round((input.projectedRecovery * skippedWindowCount) / input.totalWindowCount);
}

function metersWithComplicationOnset(
	meters: EventWindowMeterSnapshot,
	complication: ThumperComplicationId
): EventWindowMeterSnapshot {
	const key = COMPLICATION_PRIMARY_METER[complication];
	return applyMeterDelta(meters, key, COMPLICATION_METER_ONSET[complication]);
}

export type EventWindowStakeOption = {
	id: ThumperWindowResponseOptionId;
	effectLine: string;
};

export type EventWindowOutcome = {
	beforeState: EventWindowMeterSnapshot;
	afterState: EventWindowMeterSnapshot;
	recoveryPenalty: number;
	frameBonusRecovery: number;
};

function matchingActionEffectLine(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	pilotFrame: FrameId;
}): string {
	const meterKey = COMPLICATION_PRIMARY_METER[input.complication];
	const meterLabel =
		meterKey === 'signalLock'
			? 'Signal Lock'
			: meterKey === 'pumpFlow'
				? 'Pump Flow'
				: meterKey === 'threatPressure'
					? 'Threat Pressure'
					: 'Hull Condition';

	const frameBonus = getFrameMatchingBonusRecovery(input.pilotFrame, input.matchingAction);
	const bonusSuffix =
		frameBonus > 0 ? ` (+${frameBonus} ${FRAME_DISPLAY[input.pilotFrame]} bonus)` : '';

	if (input.matchingAction === 'field_repair') {
		return `Restores ${meterLabel} and consumes 1 Field Repair Kit — protects projected recovery${bonusSuffix}`;
	}

	return `Restores ${meterLabel} and protects projected recovery${bonusSuffix}`;
}

function holdEffectLine(complication: ThumperComplicationId, matchingAction: ThumperEventActionId) {
	const penalty = penaltyWasteForResponse(complication, matchingAction, 'hold');
	return `Costs about ${penalty} units of projected recovery — bounded, never destroys the run`;
}

function recallEffectLine(input: {
	projectedRecovery: number;
	windowIndex: number;
	totalWindowCount: number;
}) {
	const forfeited = computeRecallForfeitedRecovery({
		projectedRecovery: input.projectedRecovery,
		recallWindowIndex: input.windowIndex,
		totalWindowCount: input.totalWindowCount
	});
	if (forfeited <= 0) {
		return 'End the run now: keep what is secured, give up the rest';
	}
	return `End the run now: keep what is secured, forfeit about ${forfeited} units of projected recovery`;
}

/**
 * Plain-language stakes for each enabled response option on an event window.
 * Recovery penalties use the same constants as claim-time resolution.
 */
export function describeEventWindowStakes(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	pilotFrame: FrameId;
	fieldRepairKitCount: number;
	currentMeters: EventWindowMeterSnapshot;
	windowIndex: number;
	totalWindowCount: number;
}): EventWindowStakeOption[] {
	const options = getEventWindowResponseOptions({
		complication: input.complication,
		matchingAction: input.matchingAction,
		fieldRepairKitCount: input.fieldRepairKitCount
	});

	return options.map((option) => {
		if (option.id === 'hold') {
			return { id: option.id, effectLine: holdEffectLine(input.complication, input.matchingAction) };
		}
		if (option.id === 'recall_early') {
			return {
				id: option.id,
				effectLine: recallEffectLine({
					projectedRecovery: input.currentMeters.projectedRecovery,
					windowIndex: input.windowIndex,
					totalWindowCount: input.totalWindowCount
				})
			};
		}
		if (option.id === input.matchingAction) {
			return {
				id: option.id,
				effectLine: matchingActionEffectLine({
					complication: input.complication,
					matchingAction: input.matchingAction,
					pilotFrame: input.pilotFrame
				})
			};
		}
		const penalty = penaltyWasteForResponse(
			input.complication,
			input.matchingAction,
			option.id as Exclude<ThumperWindowChosenResponse, 'recall_early'>
		);
		return {
			id: option.id,
			effectLine: `Wrong action — costs about ${penalty} units of projected recovery`
		};
	});
}

/**
 * Deterministic before/after meter snapshot for a single window response.
 * Hold recovery penalty matches {@link penaltyWasteForResponse} / claim resolution.
 */
export function resolveEventWindowOutcome(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	chosenResponse: ThumperWindowChosenResponse;
	pilotFrame: FrameId;
	currentMeters: EventWindowMeterSnapshot;
	windowIndex: number;
	totalWindowCount: number;
}): EventWindowOutcome {
	const beforeState = metersWithComplicationOnset(input.currentMeters, input.complication);
	let afterState = { ...beforeState };
	let recoveryPenalty = 0;
	let frameBonusRecovery = 0;

	if (input.chosenResponse === 'recall_early') {
		const forfeited = computeRecallForfeitedRecovery({
			projectedRecovery: beforeState.projectedRecovery,
			recallWindowIndex: input.windowIndex,
			totalWindowCount: input.totalWindowCount
		});
		afterState = {
			...beforeState,
			projectedRecovery: Math.max(0, beforeState.projectedRecovery - forfeited)
		};
		recoveryPenalty = forfeited;
		return { beforeState, afterState, recoveryPenalty, frameBonusRecovery };
	}

	if (input.chosenResponse === input.matchingAction) {
		const key = COMPLICATION_PRIMARY_METER[input.complication];
		afterState = applyMeterDelta(
			beforeState,
			key,
			COMPLICATION_METER_MATCHING_RESTORE[input.complication]
		);
		frameBonusRecovery = getFrameMatchingBonusRecovery(input.pilotFrame, input.matchingAction);
		return { beforeState, afterState, recoveryPenalty, frameBonusRecovery };
	}

	recoveryPenalty = penaltyWasteForResponse(
		input.complication,
		input.matchingAction,
		input.chosenResponse
	);
	afterState = {
		...beforeState,
		projectedRecovery: Math.max(0, beforeState.projectedRecovery - recoveryPenalty)
	};

	return { beforeState, afterState, recoveryPenalty, frameBonusRecovery };
}

function primaryMeterLabel(complication: ThumperComplicationId): string {
	const key = COMPLICATION_PRIMARY_METER[complication];
	if (key === 'signalLock') return 'Signal Lock';
	if (key === 'pumpFlow') return 'Pump Flow';
	if (key === 'threatPressure') return 'Threat Pressure';
	return 'Hull Condition';
}

/** Player-facing outcome line from a stored before/after snapshot. */
export function formatEventWindowOutcomeLine(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	chosenResponse: ThumperWindowChosenResponse;
	pilotFrame: FrameId;
	beforeState: EventWindowMeterSnapshot;
	afterState: EventWindowMeterSnapshot;
	frameBonusRecovery?: number;
}): string {
	const meterLabel = primaryMeterLabel(input.complication);
	const meterKey = COMPLICATION_PRIMARY_METER[input.complication];
	const beforeMeter = input.beforeState[meterKey];
	const afterMeter = input.afterState[meterKey];

	if (input.chosenResponse === 'recall_early') {
		const forfeited = input.beforeState.projectedRecovery - input.afterState.projectedRecovery;
		if (forfeited > 0) {
			return `Recall Early — projected recovery ${input.beforeState.projectedRecovery} → ${input.afterState.projectedRecovery} units (${forfeited} forfeited)`;
		}
		return 'Recall Early — run ended; secured progress kept';
	}

	if (input.chosenResponse === 'hold') {
		return `Held — projected recovery ${input.beforeState.projectedRecovery} → ${input.afterState.projectedRecovery} units`;
	}

	if (input.chosenResponse === input.matchingAction) {
		const actionLabel = eventActionLabel(input.matchingAction);
		const bonus = input.frameBonusRecovery ?? 0;
		const bonusText =
			bonus > 0
				? ` (+${bonus} ${FRAME_DISPLAY[input.pilotFrame]} bonus)`
				: '';
		return `${actionLabel} — ${meterLabel} ${beforeMeter}% → ${afterMeter}%, projected recovery protected${bonusText}`;
	}

	const penalty = input.beforeState.projectedRecovery - input.afterState.projectedRecovery;
	return `${eventActionLabel(input.chosenResponse as ThumperEventActionId)} — ${meterLabel} ${beforeMeter}% → ${afterMeter}%, projected recovery −${penalty} units`;
}

/** Exported for tests — hold waste per complication matches claim resolver table. */
export { COMPLICATION_PENALTY_WASTE };
