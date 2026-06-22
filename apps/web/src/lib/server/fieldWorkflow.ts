import {
	claimOpenThumperRunForPilot,
	getOpenThumperRunForPilot,
	getPilotTutorialStep,
	resolveThumperRunForStoredWindows
} from '@async-frontier-mmo/db';
import { isProjectLedDefenseRun, isProjectLedCommandQueueRun, isThumperRunClaimable } from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';
import {
	firstAsyncWaiverActiveForRun,
	loadFirstAsyncTailState
} from './firstAsyncTailState.js';

export async function claimOpenRun(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now: Date,
	options?: { skipProspectingCycleScatter?: boolean }
) {
	const tutorialStep = await getPilotTutorialStep(db, pilotId);
	const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });

	return claimOpenThumperRunForPilot(db, {
		pilotId,
		now,
		skipProspectingCycleScatter: options?.skipProspectingCycleScatter,
		isClaimable: (run, windows) => {
			if (
				isProjectLedDefenseRun((run as { runMode?: string | null }).runMode) ||
				isProjectLedCommandQueueRun((run as { runMode?: string | null }).runMode)
			) {
				return true;
			}
			return isThumperRunClaimable({
				run,
				windows,
				now,
				firstAsyncWaiverActive: firstAsyncWaiverActiveForRun({
					hullIntegrity: run.runHullIntegrity ?? 100,
					extractionTailMinutes: run.extractionTailMinutes,
					thumperRunId: run.id,
					firstAsync
				})
			});
		},
		isResolvableRun: () => true,
		validateWindows: () => {},
		buildResult: (tx, run, windows, now) =>
			resolveThumperRunForStoredWindows(
				tx,
				run as Parameters<typeof resolveThumperRunForStoredWindows>[1],
				windows,
				{
					firstAsyncWaiverActive: firstAsyncWaiverActiveForRun({
						hullIntegrity:
							(run as { runHullIntegrity?: number }).runHullIntegrity ?? 100,
						extractionTailMinutes: run.extractionTailMinutes,
						thumperRunId: run.id,
						firstAsync
					}),
					now
				}
			),
		grantResourceReward: true
	});
}
