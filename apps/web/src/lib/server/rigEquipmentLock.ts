import {
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getThumperRunResultForRun
} from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';

type Db = ReturnType<typeof getGameDb>;

export type RigClaimScreenMode = 'none' | 'pending' | 'claimable' | 'result';

/** Shared rule for server guards and rig screen load (no extra DB round-trips). */
export function rigEquipmentLockedFromState(input: {
	hasOpenRun: boolean;
	claimMode: RigClaimScreenMode;
}): boolean {
	return (
		input.hasOpenRun ||
		input.claimMode === 'claimable' ||
		input.claimMode === 'result'
	);
}

/** True while a run is open or a claim result awaits acknowledgement. */
export async function isRigEquipmentLocked(db: Db, pilotId: string): Promise<boolean> {
	if (await getOpenThumperRunForPilot(db, pilotId)) {
		return true;
	}

	const latestRun = await getLatestThumperRunForPilot(db, pilotId);
	if (!latestRun?.claimedAt) {
		return false;
	}

	const result = await getThumperRunResultForRun(db, latestRun.id);
	return result !== null && result.acknowledgedAt === null;
}

export const RIG_EQUIPMENT_LOCKED_MESSAGE =
	'Equipment is locked while the thumper is deployed';
