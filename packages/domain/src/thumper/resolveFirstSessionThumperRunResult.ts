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

export {
	type ThumperEventWindowResponse,
	type ThumperRunResult,
	type ThumperWindowChosenResponse
};

/** Base tutorial extraction before event penalties (Decision 011). */
export const FIRST_SESSION_PROJECTED_RECOVERY = 60;

/** Minimum recovered Veyrith Copper to craft Survey Scanner Module Mk I on first claim. */
export const FIRST_SESSION_SCANNER_MINIMUM = 40;

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
}): ThumperRunResult {
	if (input.targetResourceId !== FIRST_SESSION_TARGET) {
		throw new Error(
			`First-session run result is only defined for ${FIRST_SESSION_TARGET}`
		);
	}

	if (input.responses.length !== 2) {
		throw new Error('First-session run expects exactly two event window responses');
	}

	const eventWindows =
		input.eventWindows ??
		generateFirstSessionEventWindows({ targetResourceId: input.targetResourceId }).windows;

	return resolveThumperRunResult({
		runConfig: {
			targetResourceId: input.targetResourceId,
			projectedRecovery: FIRST_SESSION_PROJECTED_RECOVERY,
			recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM
		},
		eventWindows,
		responses: input.responses,
		pilotFrame: input.pilotFrame
	});
}
