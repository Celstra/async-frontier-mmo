import {
	DEFENSE_ACTION_KINDS,
	applyDefenseAction,
	type DefenseActionKind,
	type DefenseActionLogEntry,
	replayDefenseRun,
	resolveDefenseRunResult,
	isDefenseRunEnded
} from '@async-frontier-mmo/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { getThumperRunPartSnapshots } from './thumperRunParts.js';
import { getOpenThumperRunForPilot } from './thumperRuns.js';

export type StoredDefenseActionLogEntry = {
	tick: number;
	kind: string;
	target?: string | null;
};

function parseDefenseActionLog(value: unknown): DefenseActionLogEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	return value.flatMap((entry) => {
		if (!entry || typeof entry !== 'object') {
			return [];
		}
		const row = entry as Record<string, unknown>;
		if (typeof row.tick !== 'number' || typeof row.kind !== 'string') {
			return [];
		}
		if (!DEFENSE_ACTION_KINDS.includes(row.kind as DefenseActionKind)) {
			return [];
		}
		return [
			{
				tick: row.tick,
				kind: row.kind as DefenseActionKind,
				target: typeof row.target === 'string' ? row.target : undefined
			}
		];
	});
}

export async function getDefenseActionLogForRun(
	db: DbExecutor,
	thumperRunId: string
): Promise<DefenseActionLogEntry[]> {
	const [run] = await db
		.select({ defenseActionLog: thumperRuns.defenseActionLog })
		.from(thumperRuns)
		.where(eq(thumperRuns.id, thumperRunId))
		.limit(1);

	return parseDefenseActionLog(run?.defenseActionLog ?? []);
}

export async function replayDefenseRunForStoredRun(
	db: DbExecutor,
	run: {
		id: string;
		runSeed: string;
		deployedAt: Date;
		trueConcentrationPercent: number | null;
		defenseActionLog?: unknown;
	},
	now: Date
) {
	const parts = await getThumperRunPartSnapshots(db, run.id);
	const actions = parseDefenseActionLog(run.defenseActionLog ?? []);

	return replayDefenseRun({
		runSeed: run.runSeed,
		concentrationPercent: run.trueConcentrationPercent ?? 67,
		parts,
		actions,
		deployedAt: run.deployedAt,
		now
	});
}

export type AppendDefenseActionOutcome =
	| {
			status: 'recorded';
			state: Awaited<ReturnType<typeof replayDefenseRunForStoredRun>>;
			recordedTick: number;
	  }
	| { status: 'no_open_run' }
	| { status: 'run_ended' }
	| { status: 'invalid_action'; reason: string }
	| { status: 'duplicate_tick' };

export async function appendDefenseActionForPilot(
	db: Db,
	input: {
		pilotId: string;
		kind: DefenseActionKind;
		target?: string;
		now: Date;
	}
): Promise<AppendDefenseActionOutcome> {
	return db.transaction(async (tx) => {
		const run = await getOpenThumperRunForPilot(tx, input.pilotId);
		if (!run) {
			return { status: 'no_open_run' as const };
		}

		const currentState = await replayDefenseRunForStoredRun(tx, run, input.now);
		if (isDefenseRunEnded(currentState)) {
			return { status: 'run_ended' as const };
		}

		const existingLog = parseDefenseActionLog(run.defenseActionLog ?? []);
		if (existingLog.some((entry) => entry.tick === currentState.currentTick)) {
			return { status: 'duplicate_tick' as const };
		}

		const validation = applyDefenseAction(currentState, {
			kind: input.kind,
			target: input.target
		});
		if (!validation.ok) {
			return { status: 'invalid_action' as const, reason: validation.reason };
		}

		const recordedTick = currentState.currentTick;

		const nextLog: StoredDefenseActionLogEntry[] = [
			...existingLog,
			{
				tick: recordedTick,
				kind: input.kind,
				target: input.target ?? null
			}
		];

		const [updated] = await tx
			.update(thumperRuns)
			.set({ defenseActionLog: nextLog })
			.where(and(eq(thumperRuns.id, run.id), isNull(thumperRuns.claimedAt)))
			.returning({ id: thumperRuns.id });

		if (!updated) {
			return { status: 'run_ended' as const };
		}

		const state = await replayDefenseRunForStoredRun(
			tx,
			{ ...run, defenseActionLog: nextLog },
			input.now
		);

		return { status: 'recorded' as const, state, recordedTick };
	});
}

export async function resolveDefenseRunPayload(
	db: DbExecutor,
	run: {
		id: string;
		targetResourceId: string;
		runSeed: string;
		deployedAt: Date;
		trueConcentrationPercent: number | null;
		defenseActionLog?: unknown;
	},
	now: Date
) {
	const state = await replayDefenseRunForStoredRun(db, run, now);
	const resolved = resolveDefenseRunResult(state);

	return {
		targetResourceId: run.targetResourceId,
		projectedRecovery: resolved.recoveredQuantity,
		recoveredQuantity: resolved.recoveredQuantity,
		wasteQuantity: resolved.wasteQuantity,
		forfeitedRecovery: resolved.forfeitedRecovery,
		resolutionType: resolved.resolutionType,
		recallReason: resolved.recallReason ?? undefined,
		appliedWear: resolved.appliedWear,
		explanation: resolved.explanation,
		defenseSummary: {
			secured: resolved.recoveredQuantity,
			cargoLost: resolved.cargoLost,
			endingCondition: resolved.endingCondition,
			recalled: state.recalled,
			failed: state.failed
		}
	};
}
