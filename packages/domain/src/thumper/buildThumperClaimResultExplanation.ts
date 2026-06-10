import type { FrameId } from 'shared';
import { complicationDisplayName, eventActionLabel } from './eventActionLabels.js';
import { getFrameMatchingBonusRecovery } from './frameActionEffects.js';
import {
	applyWearToRunParts,
	computeRunPartWearDeltas
} from './thumperPartModifiers.js';
import type { ThumperPartSnapshot } from './thumperPartTypes.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type {
	ThumperEventWindowResponse,
	ThumperEventWindowSnapshot,
	ThumperRunResolutionType,
	ThumperWindowChosenResponse
} from './resolveThumperRunResult.js';
import { penaltyWasteForResponse, describeClaimWindowConsequence } from './thumperWindowResolution.js';

export type ThumperWindowExplanationLine = {
	windowIndex: number;
	complication: ThumperComplicationId;
	complicationLabel: string;
	chosenResponse: ThumperWindowChosenResponse;
	chosenLabel: string;
	consequence: string;
	wasteFromWindow: number;
	frameBonusRecovery: number;
};

export type ThumperPartWearExplanationLine = {
	slot: string;
	displayName: string;
	conditionBefore: number;
	conditionAfter: number;
	integrityBefore: number;
	integrityAfter: number;
	conditionDelta: number;
	integrityDelta: number;
};

export type ThumperClaimResultExplanation = {
	summary: string;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedRecovery: number;
	resolutionType: ThumperRunResolutionType;
	salvageNote: string;
	windowLines: ThumperWindowExplanationLine[];
	wearLines: ThumperPartWearExplanationLine[];
	payoutAdjustments: string[];
	legacyExplanation: string;
};

function chosenResponseLabel(response: ThumperWindowChosenResponse): string {
	if (response === 'hold') return 'Hold / ignore';
	if (response === 'recall_early') return 'Recall Early';
	return eventActionLabel(response);
}

/**
 * Decision 013 comprehension gate — structured chain a tester can read without opening domain code.
 */
export function buildThumperClaimResultExplanation(input: {
	targetResourceDisplayName: string;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedRecovery: number;
	resolutionType: ThumperRunResolutionType;
	explanation: string;
	eventWindows: ThumperEventWindowSnapshot[];
	responses: ThumperEventWindowResponse[];
	pilotFrame: FrameId;
	partSnapshots: ThumperPartSnapshot[];
	isPushRun: boolean;
}): ThumperClaimResultExplanation {
	const recallIndex = input.responses.find(
		(response) => response.chosenResponse === 'recall_early'
	)?.windowIndex;

	const windowLines: ThumperWindowExplanationLine[] = [];

	for (const window of input.eventWindows) {
		if (recallIndex !== undefined && window.windowIndex >= recallIndex) {
			if (window.windowIndex === recallIndex) {
				const response = input.responses.find((row) => row.windowIndex === recallIndex);
				if (response) {
					windowLines.push({
						windowIndex: window.windowIndex,
						complication: window.complication,
						complicationLabel: complicationDisplayName(window.complication),
						chosenResponse: 'recall_early',
						chosenLabel: chosenResponseLabel('recall_early'),
						consequence:
							'Run ended early — secured progress kept; remaining projected recovery forfeited.',
						wasteFromWindow: 0,
						frameBonusRecovery: 0
					});
				}
			}
			continue;
		}

		const response = input.responses.find((row) => row.windowIndex === window.windowIndex);
		if (!response || response.chosenResponse === 'recall_early') {
			continue;
		}

		const chosenResponse = response.chosenResponse;
		const wasteFromWindow = penaltyWasteForResponse(
			window.complication,
			window.matchingAction,
			chosenResponse
		);

		const frameBonusRecovery =
			chosenResponse === window.matchingAction
				? getFrameMatchingBonusRecovery(input.pilotFrame, window.matchingAction)
				: 0;

		windowLines.push({
			windowIndex: window.windowIndex,
			complication: window.complication,
			complicationLabel: complicationDisplayName(window.complication),
			chosenResponse,
			chosenLabel: chosenResponseLabel(chosenResponse),
			consequence: describeClaimWindowConsequence(
				window.complication,
				window.matchingAction,
				chosenResponse,
				frameBonusRecovery,
				input.pilotFrame
			),
			wasteFromWindow,
			frameBonusRecovery
		});
	}

	const wearDeltas = computeRunPartWearDeltas(input.responses, { isPushRun: input.isPushRun });
	const afterWear = applyWearToRunParts(input.partSnapshots, wearDeltas);
	const wearLines: ThumperPartWearExplanationLine[] = input.partSnapshots.map((before) => {
		const after = afterWear.find((part) => part.itemId === before.itemId)!;
		return {
			slot: before.slot,
			displayName: before.displayName,
			conditionBefore: before.condition,
			conditionAfter: after.condition,
			integrityBefore: before.integrity,
			integrityAfter: after.integrity,
			conditionDelta: after.condition - before.condition,
			integrityDelta: after.integrity - before.integrity
		};
	});

	const payoutAdjustments: string[] = [];
	if (input.forfeitedRecovery > 0) {
		payoutAdjustments.push(
			`Recall Early forfeited ${input.forfeitedRecovery} projected recovery from uncompleted windows.`
		);
	}
	if (input.wasteQuantity > 0) {
		payoutAdjustments.push(
			`${input.wasteQuantity} units converted to waste from window penalties (named resource stats unchanged).`
		);
	}

	const salvageNote =
		input.wasteQuantity > 0
			? `${input.wasteQuantity} units recorded as extraction waste/scrap — no rare salvage this tutorial run.`
			: 'No waste/scrap salvage — extraction stayed clean.';

	const summary = `Recovered ${input.recoveredQuantity} ${input.targetResourceDisplayName} from ${input.projectedRecovery} projected (${input.resolutionType}).`;

	return {
		summary,
		projectedRecovery: input.projectedRecovery,
		recoveredQuantity: input.recoveredQuantity,
		wasteQuantity: input.wasteQuantity,
		forfeitedRecovery: input.forfeitedRecovery,
		resolutionType: input.resolutionType,
		salvageNote,
		windowLines,
		wearLines,
		payoutAdjustments,
		legacyExplanation: input.explanation
	};
}
