import { eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { getThumperEventWindowsForRun, insertThumperEventWindows } from './thumperEventWindows.js';
import {
	claimThumperRun,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	insertThumperRun
} from './thumperRuns.js';
import { getThumperRunResultForRun, insertThumperRunResult } from './thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export type ThumperRunResultPayload = {
	targetResourceId: string;
	projectedRecovery: number;
	recoveredQuantity: number;
	wasteQuantity: number;
	explanation: string;
};

export type ClaimThumperRunOutcome =
	| {
			status: 'claimed';
			claimResult: Awaited<ReturnType<typeof insertThumperRunResult>> | null;
	  }
	| {
			status: 'already_claimed';
			claimResult: Awaited<ReturnType<typeof getThumperRunResultForRun>>;
	  }
	| { status: 'no_open_run' }
	| { status: 'not_claimable' }
	| { status: 'invalid_windows'; message: string };

type EventWindowSeed = {
	windowIndex: number;
	complication: string;
	matchingAction: string;
};

/** Insert run + event windows atomically. Rolls back the run if window insert fails. */
export async function deployThumperRunWithEventWindows(
	db: Db,
	input: {
		pilotId: string;
		pilotFrameId: string;
		targetResourceId: string;
		deployedAt: Date;
		durationSeconds: number;
		windows: EventWindowSeed[];
	}
) {
	return db.transaction(async (tx: DbExecutor) => {
		const run = await insertThumperRun(tx, {
			pilotId: input.pilotId,
			pilotFrameId: input.pilotFrameId,
			targetResourceId: input.targetResourceId,
			deployedAt: input.deployedAt,
			durationSeconds: input.durationSeconds
		});

		if (input.windows.length > 0) {
			await insertThumperEventWindows(tx, {
				thumperRunId: run.id,
				windows: input.windows
			});
		}

		return run;
	});
}

/**
 * Claim gate: conditional claimed_at update must win before result insert.
 * Duplicate claim returns existing result without inserting again.
 */
export async function claimOpenThumperRunForPilot(
	db: Db,
	input: {
		pilotId: string;
		now: Date;
		isClaimable: (run: { deployedAt: Date; durationSeconds: number }) => boolean;
		validateWindows: (
			run: { id: string; targetResourceId: string; pilotFrameId: string },
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => void;
		buildResult: (
			run: { id: string; targetResourceId: string; pilotFrameId: string },
			windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
		) => ThumperRunResultPayload;
	}
): Promise<ClaimThumperRunOutcome> {
	return db.transaction(async (tx: DbExecutor) => {
		const run = await getOpenThumperRunForPilot(tx, input.pilotId);
		if (!run) {
			const latest = await getLatestThumperRunForPilot(tx, input.pilotId);
			if (latest?.claimedAt) {
				const existingResult = await getThumperRunResultForRun(tx, latest.id);
				return { status: 'already_claimed', claimResult: existingResult };
			}

			return { status: 'no_open_run' };
		}

		if (!input.isClaimable(run)) {
			return { status: 'not_claimable' };
		}

		const windows = await getThumperEventWindowsForRun(tx, run.id);

		try {
			input.validateWindows(run, windows);
		} catch (error) {
			return {
				status: 'invalid_windows',
				message: error instanceof Error ? error.message : 'Invalid event windows'
			};
		}

		const claimedRun = await claimThumperRun(tx, run.id);
		if (!claimedRun) {
			const [currentRun] = await tx
				.select()
				.from(thumperRuns)
				.where(eq(thumperRuns.id, run.id))
				.limit(1);
			const existingResult = await getThumperRunResultForRun(tx, run.id);

			if (currentRun?.claimedAt) {
				return { status: 'already_claimed', claimResult: existingResult };
			}

			return { status: 'no_open_run' };
		}

		if (run.targetResourceId === 'veyrith_copper') {
			const resultPayload = input.buildResult(run, windows);
			const claimResult = await insertThumperRunResult(tx, {
				thumperRunId: run.id,
				targetResourceId: resultPayload.targetResourceId,
				projectedRecovery: resultPayload.projectedRecovery,
				recoveredQuantity: resultPayload.recoveredQuantity,
				wasteQuantity: resultPayload.wasteQuantity,
				explanation: resultPayload.explanation,
				resolvedAt: input.now
			});

			return { status: 'claimed', claimResult };
		}

		return { status: 'claimed', claimResult: null };
	});
}
