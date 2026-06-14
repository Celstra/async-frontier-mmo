import { getPlaytestEventOnce, recordPlaytestEventOnce } from '@async-frontier-mmo/db';
import {
	FIRST_ASYNC_TAIL_MINUTES,
	hullTierFromIntegrity,
	resolveFirstAsyncWaiverActive
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

type Db = ReturnType<typeof getGameDb>;

export type FirstAsyncTailState = {
	/** 15m selectable at async reveal (pre-event) or after choice until first deploy. */
	tailUnlockActive: boolean;
	/** Hull fail-safe waiver applies on the next qualifying deploy (post-choice, pre-deploy). */
	waiverPending: boolean;
	waiverRunId: string | null;
};

export async function loadFirstAsyncTailState(
	db: Db,
	pilotId: string,
	options?: { tutorialStep?: string | null }
): Promise<FirstAsyncTailState> {
	const [asyncChosen, deployUsed] = await Promise.all([
		getPlaytestEventOnce(db, pilotId, 'async_duration_chosen'),
		getPlaytestEventOnce(db, pilotId, 'first_async_deploy_used')
	]);

	const waiverRunId =
		typeof deployUsed?.payload.thumperRunId === 'string' ? deployUsed.payload.thumperRunId : null;
	const waiverPending = asyncChosen !== null && deployUsed === null;
	const atAsyncReveal = options?.tutorialStep === 'async_reveal';
	const tailUnlockActive = atAsyncReveal || waiverPending;

	return {
		tailUnlockActive,
		waiverPending,
		waiverRunId
	};
}

export async function recordFirstAsyncDeployUsed(
	db: Db,
	pilotId: string,
	thumperRunId: string
): Promise<void> {
	await recordPlaytestEventOnce(db, {
		pilotId,
		eventName: 'first_async_deploy_used',
		payload: { thumperRunId }
	});
}

export function firstAsyncWaiverActiveForRun(input: {
	hullIntegrity: number;
	extractionTailMinutes: number;
	thumperRunId: string;
	firstAsync: FirstAsyncTailState;
}): boolean {
	return resolveFirstAsyncWaiverActive({
		hullTier: hullTierFromIntegrity(input.hullIntegrity),
		hullIntegrityAtDeploy: input.hullIntegrity,
		extractionTailMinutes: input.extractionTailMinutes,
		firstAsyncUnlockPending: input.firstAsync.waiverPending,
		waiverRunId: input.firstAsync.waiverRunId,
		thumperRunId: input.thumperRunId
	});
}

export function deployPreviewFirstAsyncWaiverActive(
	hullIntegrity: number,
	extractionTailMinutes: number,
	firstAsync: FirstAsyncTailState
): boolean {
	if (!firstAsync.waiverPending) {
		return false;
	}

	return resolveFirstAsyncWaiverActive({
		hullTier: hullTierFromIntegrity(hullIntegrity),
		hullIntegrityAtDeploy: hullIntegrity,
		extractionTailMinutes,
		firstAsyncUnlockPending: true
	});
}

export function firstAsyncUnlockForEquippedHull(
	hullIntegrity: number,
	firstAsync: FirstAsyncTailState
): boolean {
	if (!firstAsync.tailUnlockActive) {
		return false;
	}

	return resolveFirstAsyncWaiverActive({
		hullTier: hullTierFromIntegrity(hullIntegrity),
		hullIntegrityAtDeploy: hullIntegrity,
		extractionTailMinutes: FIRST_ASYNC_TAIL_MINUTES,
		firstAsyncUnlockPending: true
	});
}
