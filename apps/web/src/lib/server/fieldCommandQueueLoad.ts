import { loadCommandQueueFieldViewForPilot } from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';

export async function loadFieldCommandQueueView(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
) {
	const view = await loadCommandQueueFieldViewForPilot(db, pilotId);
	if (!view) {
		return null;
	}

	return {
		runId: view.runId,
		scannerQuality: view.scannerQuality,
		meters: {
			secured: view.state.secured,
			loose: view.state.loose,
			lost: view.state.lost,
			hull: view.state.hull,
			heat: view.state.heat,
			guard: view.state.guard,
			heatLimit: view.heatLimit
		},
		currentBeat: view.state.currentBeat,
		totalBeats: view.totalBeats,
		queueLength: view.queueLength,
		queueSlots: view.queueSlots,
		forecast: view.forecast,
		nextFillBeatIndex: view.nextFillBeatIndex,
		canAdvanceBeat: view.canAdvanceBeat,
		canClaim: view.canClaim,
		recalled: view.recalled,
		resolvedBeatCount: view.resolvedBeatCount,
		ended: view.state.ended
	};
}

export type FieldCommandQueueView = NonNullable<
	Awaited<ReturnType<typeof loadFieldCommandQueueView>>
>;
