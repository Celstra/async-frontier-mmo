import { loadSettlementMissionTicker } from '$lib/server/settlementLoad';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	const missionTicker = await loadSettlementMissionTicker(db, pilotId);

	return { missionTicker };
};
