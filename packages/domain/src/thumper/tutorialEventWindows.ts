import {
	COMPLICATION_MATCHING_ACTION,
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES
} from './complicationActions.js';
import type { TutorialThumperRun } from './tutorialThumperRuns.js';
import type { NamedResourceId } from '../resources/types.js';
import type { ThumperEventWindowPlan } from './types.js';

const TUTORIAL_RUN_WINDOWS: Record<TutorialThumperRun, readonly ['signal_drift', ...('pump_strain' | 'signal_drift')[]]> = {
	1: ['signal_drift'],
	2: ['signal_drift', 'pump_strain']
};

/**
 * Slice §6 scripted tutorial windows — any sampled waypoint, deterministic order, no quiet windows.
 */
export function generateTutorialEventWindows(input: {
	targetResourceId: NamedResourceId;
	tutorialRun: TutorialThumperRun;
}): ThumperEventWindowPlan {
	const complications = TUTORIAL_RUN_WINDOWS[input.tutorialRun];

	const windows = complications.map((complication, index) => ({
		windowIndex: index + 1,
		quiet: false as const,
		complication,
		matchingAction: COMPLICATION_MATCHING_ACTION[complication],
		severity: 'minor' as const
	}));

	return {
		windows,
		eventActions: THUMPER_EVENT_ACTIONS,
		safetyChoices: THUMPER_SAFETY_CHOICES
	};
}
