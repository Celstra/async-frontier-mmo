import type { ActiveRunMeterPreview } from './deployPreview.js';
import { eventActionLabel } from './eventActionLabels.js';
import {
	MATCHING_ACTION_WEAR_CONDITION,
	MATCHING_ACTION_WEAR_PART_SLOT,
	THUMPER_PART_SLOT_LABEL,
	type EventWindowSeverity
} from './eventWindowSeverity.js';
import { holdPenaltyForResponse, holdPenaltyRangeLabel } from './holdPenalty.js';
import type { ThumperWindowResponseOptionId } from './getEventWindowResponseOptions.js';
import { getEventWindowResponseOptions } from './getEventWindowResponseOptions.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type { ThumperWindowChosenResponse } from './resolveThumperRunResult.js';
import {
	COMPLICATION_PENALTY_WASTE,
	penaltyWasteForResponse
} from './thumperWindowResolution.js';

export type EventWindowMeterSnapshot = ActiveRunMeterPreview & {
	severity?: EventWindowSeverity;
};

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
	/** Extended stakes info with concrete projected numbers (Item 3 UX pass). */
	projected?: EventWindowProjectedMetrics;
};

/** Projected meter values for a response option to show concrete consequences. */
export type EventWindowProjectedMetrics = {
	/** Primary meter affected by this complication (e.g., hullCondition). */
	primaryMeterKey: PrimaryMeterKey;
	/** Current meter value before any response (after complication onset). */
	beforeValue: number;
	/** Projected meter value after choosing this response. */
	afterValue: number;
	/** Human-readable meter label. */
	meterLabel: string;
	/** Recovery penalty for this response (negative means loss). */
	recoveryDelta: number;
	/** Frame bonus recovery if matching action. */
	frameBonus?: number;
	/** Part wear condition loss if matching action (excluding field_repair). */
	partWear?: number;
	/** Whether this response would leave the meter in "danger" zone (<25%). */
	isDangerous: boolean;
};

export type EventWindowOutcome = {
	severity: EventWindowSeverity;
	beforeState: EventWindowMeterSnapshot;
	afterState: EventWindowMeterSnapshot;
	recoveryPenalty: number;
	frameBonusRecovery: number;
	actionWearCondition: number;
};

function matchingActionEffectLine(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
}): string {
	if (input.matchingAction === 'field_repair') {
		return 'Protects your yield — consumes 1 Field Repair Kit';
	}

	const slot = MATCHING_ACTION_WEAR_PART_SLOT[input.matchingAction];
	const partLabel = THUMPER_PART_SLOT_LABEL[slot];
	return `Protects your yield — wears the ${partLabel} by ${MATCHING_ACTION_WEAR_CONDITION} Condition`;
}

function holdEffectLine(input: {
	severity: EventWindowSeverity;
	complication: ThumperComplicationId;
	onsetMeters: EventWindowMeterSnapshot;
	tutorialDeterministic?: boolean;
}) {
	if (input.tutorialDeterministic) {
		const penalty = holdPenaltyForResponse({
			severity: input.severity,
			complication: input.complication,
			meters: input.onsetMeters,
			tutorialDeterministic: true
		});
		return `Lose about ${penalty} units — your gear is untouched`;
	}

	const range = holdPenaltyRangeLabel(input.severity);
	const implied = holdPenaltyForResponse({
		severity: input.severity,
		complication: input.complication,
		meters: input.onsetMeters
	});
	return `Lose ${range} units (~${implied} at current meter) — gear untouched`;
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
 * Compute projected metrics for a response option using the same math as claim resolution.
 * This gives players concrete numbers to make informed choices (Item 3 UX pass).
 */
export function computeEventWindowProjectedMetrics(input: {
	optionId: ThumperWindowResponseOptionId;
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	severity: EventWindowSeverity;
	currentMeters: EventWindowMeterSnapshot;
	windowIndex: number;
	totalWindowCount: number;
	tutorialDeterministic?: boolean;
}): EventWindowProjectedMetrics {
	const key = COMPLICATION_PRIMARY_METER[input.complication];
	const meterLabel =
		key === 'signalLock'
			? 'Signal Lock'
			: key === 'pumpFlow'
				? 'Pump Flow'
				: key === 'threatPressure'
					? 'Threat Pressure'
					: 'Hull Condition';

	// Calculate onset (what the player currently sees after complication fired)
	const onsetMeters = metersWithComplicationOnset(input.currentMeters, input.complication);
	const beforeValue = onsetMeters[key];

	let afterValue = beforeValue;
	let recoveryDelta = 0;
	let frameBonus = 0;
	let partWear: number | undefined;

	if (input.optionId === 'recall_early') {
		const forfeited = computeRecallForfeitedRecovery({
			projectedRecovery: onsetMeters.projectedRecovery,
			recallWindowIndex: input.windowIndex,
			totalWindowCount: input.totalWindowCount
		});
		recoveryDelta = -forfeited;
	} else if (input.optionId === input.matchingAction) {
		// Matching action: restore the meter
		afterValue = clampMeter(beforeValue + COMPLICATION_METER_MATCHING_RESTORE[input.complication]);
		recoveryDelta = 0;
		if (input.matchingAction !== 'field_repair') {
			partWear = MATCHING_ACTION_WEAR_CONDITION;
		}
	} else if (input.optionId === 'hold') {
		// Hold: meter stays at onset, waste penalty
		recoveryDelta = -penaltyWasteForResponse(
			input.complication,
			input.matchingAction,
			'hold',
			{
				severity: input.severity,
				onsetMeters,
				tutorialDeterministic: input.tutorialDeterministic
			}
		);
	} else {
		// Wrong action: meter stays at onset, bigger waste penalty
		recoveryDelta = -penaltyWasteForResponse(
			input.complication,
			input.matchingAction,
			input.optionId as Exclude<ThumperWindowChosenResponse, 'recall_early'>,
			{ severity: input.severity, tutorialDeterministic: input.tutorialDeterministic }
		);
	}

	return {
		primaryMeterKey: key,
		beforeValue,
		afterValue,
		meterLabel,
		recoveryDelta,
		frameBonus: frameBonus > 0 ? frameBonus : undefined,
		partWear,
		isDangerous: afterValue < 25
	};
}

/**
 * Plain-language stakes for each enabled response option on an event window.
 * Recovery penalties use the same constants as claim-time resolution.
 *
 * Enhanced with projected metrics (Item 3 UX pass) to show concrete consequences.
 */
export function describeEventWindowStakes(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	severity: EventWindowSeverity;
	fieldRepairKitCount: number;
	currentMeters: EventWindowMeterSnapshot;
	windowIndex: number;
	totalWindowCount: number;
	tutorialDeterministic?: boolean;
}): EventWindowStakeOption[] {
	const options = getEventWindowResponseOptions({
		complication: input.complication,
		matchingAction: input.matchingAction,
		fieldRepairKitCount: input.fieldRepairKitCount
	});

	const onsetMeters = metersWithComplicationOnset(input.currentMeters, input.complication);

	return options.map((option) => {
		// Compute projected metrics for this option
		const projected = computeEventWindowProjectedMetrics({
			optionId: option.id,
			complication: input.complication,
			matchingAction: input.matchingAction,
			severity: input.severity,
			currentMeters: input.currentMeters,
			windowIndex: input.windowIndex,
			totalWindowCount: input.totalWindowCount,
			tutorialDeterministic: input.tutorialDeterministic
		});

		if (option.id === 'hold') {
			return {
				id: option.id,
				effectLine: holdEffectLine({
					severity: input.severity,
					complication: input.complication,
					onsetMeters,
					tutorialDeterministic: input.tutorialDeterministic
				}),
				projected
			};
		}
		if (option.id === 'recall_early') {
			return {
				id: option.id,
				effectLine: recallEffectLine({
					projectedRecovery: input.currentMeters.projectedRecovery,
					windowIndex: input.windowIndex,
					totalWindowCount: input.totalWindowCount
				}),
				projected
			};
		}
		if (option.id === input.matchingAction) {
			return {
				id: option.id,
				effectLine: matchingActionEffectLine({
					complication: input.complication,
					matchingAction: input.matchingAction
				}),
				projected
			};
		}
		const penalty = penaltyWasteForResponse(
			input.complication,
			input.matchingAction,
			option.id as Exclude<ThumperWindowChosenResponse, 'recall_early'>,
			{ severity: input.severity, tutorialDeterministic: input.tutorialDeterministic }
		);
		return {
			id: option.id,
			effectLine: `Wrong action — costs about ${penalty} units of projected recovery`,
			projected
		};
	});
}

/**
 * Deterministic before/after meter snapshot for a single window response.
 * Hold recovery penalty matches {@link penaltyWasteForResponse} / claim resolution.
 */
function snapshotWithSeverity(
	meters: EventWindowMeterSnapshot,
	severity: EventWindowSeverity
): EventWindowMeterSnapshot {
	return { ...meters, severity };
}

export function resolveEventWindowOutcome(input: {
	complication: ThumperComplicationId;
	matchingAction: ThumperEventActionId;
	severity: EventWindowSeverity;
	chosenResponse: ThumperWindowChosenResponse;
	currentMeters: EventWindowMeterSnapshot;
	windowIndex: number;
	totalWindowCount: number;
	tutorialDeterministic?: boolean;
}): EventWindowOutcome {
	const onsetMeters = metersWithComplicationOnset(input.currentMeters, input.complication);
	const beforeState = snapshotWithSeverity(onsetMeters, input.severity);
	let afterState = { ...beforeState };
	let recoveryPenalty = 0;
	let frameBonusRecovery = 0;
	let actionWearCondition = 0;

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
		return {
			severity: input.severity,
			beforeState,
			afterState: snapshotWithSeverity(afterState, input.severity),
			recoveryPenalty,
			frameBonusRecovery,
			actionWearCondition
		};
	}

	if (input.chosenResponse === input.matchingAction) {
		const key = COMPLICATION_PRIMARY_METER[input.complication];
		afterState = snapshotWithSeverity(
			applyMeterDelta(
				beforeState,
				key,
				COMPLICATION_METER_MATCHING_RESTORE[input.complication]
			),
			input.severity
		);
		if (input.matchingAction !== 'field_repair') {
			actionWearCondition = MATCHING_ACTION_WEAR_CONDITION;
		}
		return {
			severity: input.severity,
			beforeState,
			afterState,
			recoveryPenalty,
			frameBonusRecovery,
			actionWearCondition
		};
	}

	recoveryPenalty = penaltyWasteForResponse(
		input.complication,
		input.matchingAction,
		input.chosenResponse,
		{
			severity: input.severity,
			onsetMeters: beforeState,
			tutorialDeterministic: input.tutorialDeterministic
		}
	);
	afterState = snapshotWithSeverity(
		{
			...beforeState,
			projectedRecovery: Math.max(0, beforeState.projectedRecovery - recoveryPenalty)
		},
		input.severity
	);

	return {
		severity: input.severity,
		beforeState,
		afterState,
		recoveryPenalty,
		frameBonusRecovery,
		actionWearCondition
	};
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

	const severityLabel =
		input.beforeState.severity === 'serious' ? ' (serious)' : '';

	if (input.chosenResponse === 'hold') {
		return `Held${severityLabel} — projected recovery ${input.beforeState.projectedRecovery} → ${input.afterState.projectedRecovery} units — gear untouched`;
	}

	if (input.chosenResponse === input.matchingAction) {
		const actionLabel = eventActionLabel(input.matchingAction);
		if (input.matchingAction === 'field_repair') {
			return `${actionLabel}${severityLabel} — ${meterLabel} ${beforeMeter}% → ${afterMeter}%, yield protected, Field Repair Kit consumed`;
		}
		const slot = MATCHING_ACTION_WEAR_PART_SLOT[input.matchingAction];
		const partLabel = THUMPER_PART_SLOT_LABEL[slot];
		return `${actionLabel}${severityLabel} — ${meterLabel} ${beforeMeter}% → ${afterMeter}%, yield protected, ${partLabel} −${MATCHING_ACTION_WEAR_CONDITION} Condition`;
	}

	const penalty = input.beforeState.projectedRecovery - input.afterState.projectedRecovery;
	return `${eventActionLabel(input.chosenResponse as ThumperEventActionId)} — ${meterLabel} ${beforeMeter}% → ${afterMeter}%, projected recovery −${penalty} units`;
}

/** Exported for tests — hold waste per complication matches claim resolver table. */
export { COMPLICATION_PENALTY_WASTE };
