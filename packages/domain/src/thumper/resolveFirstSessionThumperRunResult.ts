import type { FrameId } from 'shared';
import type { NamedResourceId } from '../resources/types.js';
import { generateFirstSessionEventWindows } from './generateFirstSessionEventWindows.js';
import {
	resolveThumperRunResult,
	type ThumperEventWindowResponse,
	type ThumperEventWindowSnapshot,
	type ThumperRunResult,
	type ThumperWindowChosenResponse
} from './resolveThumperRunResult.js';
import type { ThumperPartRunModifiers } from './thumperPartTypes.js';

export {
	type ThumperEventWindowResponse,
	type ThumperRunResult,
	type ThumperWindowChosenResponse
};

/** Base tutorial extraction before event penalties (Decision 011; BUILD_PLAN example ≈118 claimed). */
export const FIRST_SESSION_PROJECTED_RECOVERY = 113;

/** Minimum recovered Veyrith Copper for conductive_core (Decision 021-C: 30 units). */
export const FIRST_SESSION_SCANNER_MINIMUM = 30;

const FIRST_SESSION_TARGET: NamedResourceId = 'veyrith_copper';

/**
 * Decision 011 — resolve first-session Veyrith Copper run from stored window responses.
 * Delegates to {@link resolveThumperRunResult}. Pass {@link eventWindows} from DB rows at claim time.
 */
export function resolveFirstSessionThumperRunResult(input: {
	targetResourceId: NamedResourceId;
	responses: ThumperEventWindowResponse[];
	pilotFrame: FrameId;
	eventWindows?: ThumperEventWindowSnapshot[];
	appliedWear?: number;
	partModifiers?: ThumperPartRunModifiers;
	projectedRecovery?: number;
}): ThumperRunResult {
	if (input.targetResourceId !== FIRST_SESSION_TARGET) {
		throw new Error(
			`First-session run result is only defined for ${FIRST_SESSION_TARGET}`
		);
	}

	const recalled = input.responses.some(
		(response) => response.chosenResponse === 'recall_early'
	);
	if (!recalled && input.responses.length !== 2) {
		throw new Error('First-session run expects exactly two event window responses');
	}

	const eventWindows =
		input.eventWindows ??
		(generateFirstSessionEventWindows({ targetResourceId: input.targetResourceId }).windows as ThumperEventWindowSnapshot[]);

	return resolveThumperRunResult({
		runConfig: {
			targetResourceId: input.targetResourceId,
			projectedRecovery: input.projectedRecovery ?? FIRST_SESSION_PROJECTED_RECOVERY,
			recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM,
			appliedWear: input.appliedWear ?? 0,
			partModifiers: input.partModifiers
		},
		eventWindows,
		responses: input.responses,
		pilotFrame: input.pilotFrame
	});
}
