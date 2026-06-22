import {
	THUMPER_COMMANDS,
	replayCommandQueueRun,
	type ThumperCommand
} from '@async-frontier-mmo/domain';
import { and, asc, eq, isNotNull, isNull, sql } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { thumperRunCommandLog } from '../schema/thumperRunCommandLog.js';
import { thumperRuns } from '../schema/thumperRuns.js';

export type ThumperRunCommandLogRow = {
	id: string;
	runId: string;
	beatIndex: number;
	command: string;
	recordedAt: Date;
	resolvedAt: Date | null;
};

export class ThumperCommandLogReplayError extends Error {
	constructor(
		message: string,
		readonly runId: string,
		readonly beatIndex: number,
		readonly command: string
	) {
		super(message);
		this.name = 'ThumperCommandLogReplayError';
	}
}

export function parseThumperCommandLogCommand(value: string): ThumperCommand | null {
	return THUMPER_COMMANDS.includes(value as ThumperCommand)
		? (value as ThumperCommand)
		: null;
}

export async function listThumperRunCommandLogForRun(
	db: DbExecutor,
	runId: string
): Promise<ThumperRunCommandLogRow[]> {
	return db
		.select()
		.from(thumperRunCommandLog)
		.where(eq(thumperRunCommandLog.runId, runId))
		.orderBy(asc(thumperRunCommandLog.beatIndex));
}

export async function getThumperRunCommandsForReplay(
	db: DbExecutor,
	runId: string
): Promise<ThumperCommand[]> {
	const rows = await listThumperRunCommandLogForRun(db, runId);
	const commands: ThumperCommand[] = [];

	for (const row of rows) {
		const command = parseThumperCommandLogCommand(row.command);
		if (!command) {
			throw new ThumperCommandLogReplayError(
				`Invalid command "${row.command}" at beat_index ${row.beatIndex}`,
				runId,
				row.beatIndex,
				row.command
			);
		}
		commands.push(command);
	}

	return commands;
}

export type AppendThumperRunCommandOutcome =
	| { status: 'recorded'; beatIndex: number }
	| { status: 'run_not_found' }
	| { status: 'run_claimed' }
	| { status: 'duplicate_beat_index' }
	| { status: 'invalid_command' };

export async function appendThumperRunCommandLogEntry(
	db: Db,
	input: {
		runId: string;
		command: ThumperCommand;
		recordedAt: Date;
		beatIndex?: number;
	}
): Promise<AppendThumperRunCommandOutcome> {
	return db.transaction((tx) => appendThumperRunCommandLogEntryTx(tx, input));
}

export async function appendThumperRunCommandLogEntryTx(
	tx: DbExecutor,
	input: {
		runId: string;
		command: ThumperCommand;
		recordedAt: Date;
		beatIndex?: number;
	}
): Promise<AppendThumperRunCommandOutcome> {
	if (!parseThumperCommandLogCommand(input.command)) {
		return { status: 'invalid_command' };
	}

	const [run] = await tx
		.select({ id: thumperRuns.id, claimedAt: thumperRuns.claimedAt })
		.from(thumperRuns)
		.where(eq(thumperRuns.id, input.runId))
		.for('update')
		.limit(1);

	if (!run) {
		return { status: 'run_not_found' };
	}
	if (run.claimedAt) {
		return { status: 'run_claimed' };
	}

	const beatIndex =
		input.beatIndex ?? (await nextCommandLogBeatIndex(tx, input.runId));

	const [inserted] = await tx
		.insert(thumperRunCommandLog)
		.values({
			runId: input.runId,
			beatIndex,
			command: input.command,
			recordedAt: input.recordedAt
		})
		.onConflictDoNothing({
			target: [thumperRunCommandLog.runId, thumperRunCommandLog.beatIndex]
		})
		.returning({ beatIndex: thumperRunCommandLog.beatIndex });

	if (!inserted) {
		return { status: 'duplicate_beat_index' };
	}

	return { status: 'recorded', beatIndex };
}

async function nextCommandLogBeatIndex(tx: DbExecutor, runId: string): Promise<number> {
	const [row] = await tx
		.select({
			nextBeatIndex: sql<number>`coalesce(max(${thumperRunCommandLog.beatIndex}), -1) + 1`
		})
		.from(thumperRunCommandLog)
		.where(eq(thumperRunCommandLog.runId, runId));

	return row?.nextBeatIndex ?? 0;
}

export type MarkThumperRunCommandResolvedOutcome =
	| { status: 'resolved' }
	| { status: 'not_found' }
	| { status: 'already_resolved' }
	| { status: 'run_claimed' };

export async function markThumperRunCommandLogResolved(
	db: DbExecutor,
	input: {
		runId: string;
		beatIndex: number;
		resolvedAt: Date;
	}
): Promise<MarkThumperRunCommandResolvedOutcome> {
	const [run] = await db
		.select({ claimedAt: thumperRuns.claimedAt })
		.from(thumperRuns)
		.where(eq(thumperRuns.id, input.runId))
		.limit(1);

	if (!run) {
		return { status: 'not_found' };
	}
	if (run.claimedAt) {
		return { status: 'run_claimed' };
	}

	const [updated] = await db
		.update(thumperRunCommandLog)
		.set({ resolvedAt: input.resolvedAt })
		.where(
			and(
				eq(thumperRunCommandLog.runId, input.runId),
				eq(thumperRunCommandLog.beatIndex, input.beatIndex),
				isNull(thumperRunCommandLog.resolvedAt)
			)
		)
		.returning({ id: thumperRunCommandLog.id });

	if (updated) {
		return { status: 'resolved' };
	}

	const [existing] = await db
		.select({ resolvedAt: thumperRunCommandLog.resolvedAt })
		.from(thumperRunCommandLog)
		.where(
			and(
				eq(thumperRunCommandLog.runId, input.runId),
				eq(thumperRunCommandLog.beatIndex, input.beatIndex)
			)
		)
		.limit(1);

	if (!existing) {
		return { status: 'not_found' };
	}
	if (existing.resolvedAt) {
		return { status: 'already_resolved' };
	}

	return { status: 'not_found' };
}

export type MutateThumperRunCommandOutcome =
	| { status: 'updated' }
	| { status: 'not_found' }
	| { status: 'already_resolved' }
	| { status: 'run_claimed' };

/** Only unresolved rows may change — resolved beats are immutable for replay integrity. */
export async function updateThumperRunCommandLogCommand(
	db: DbExecutor,
	input: {
		runId: string;
		beatIndex: number;
		command: ThumperCommand;
	}
): Promise<MutateThumperRunCommandOutcome> {
	if (!parseThumperCommandLogCommand(input.command)) {
		return { status: 'not_found' };
	}

	const [run] = await db
		.select({ claimedAt: thumperRuns.claimedAt })
		.from(thumperRuns)
		.where(eq(thumperRuns.id, input.runId))
		.limit(1);

	if (!run) {
		return { status: 'not_found' };
	}
	if (run.claimedAt) {
		return { status: 'run_claimed' };
	}

	const [updated] = await db
		.update(thumperRunCommandLog)
		.set({ command: input.command })
		.where(
			and(
				eq(thumperRunCommandLog.runId, input.runId),
				eq(thumperRunCommandLog.beatIndex, input.beatIndex),
				isNull(thumperRunCommandLog.resolvedAt)
			)
		)
		.returning({ id: thumperRunCommandLog.id });

	if (updated) {
		return { status: 'updated' };
	}

	const [existing] = await db
		.select({ resolvedAt: thumperRunCommandLog.resolvedAt })
		.from(thumperRunCommandLog)
		.where(
			and(
				eq(thumperRunCommandLog.runId, input.runId),
				eq(thumperRunCommandLog.beatIndex, input.beatIndex)
			)
		)
		.limit(1);

	if (!existing) {
		return { status: 'not_found' };
	}
	if (existing.resolvedAt) {
		return { status: 'already_resolved' };
	}

	return { status: 'not_found' };
}

export async function replayThumperRunFromCommandLog(
	db: DbExecutor,
	input: {
		runId: string;
		runSeed: string;
	}
) {
	const commands = await getThumperRunCommandsForReplay(db, input.runId);
	return replayCommandQueueRun({
		runSeed: input.runSeed,
		commands
	});
}

export async function countUnresolvedThumperRunCommands(
	db: DbExecutor,
	runId: string
): Promise<number> {
	const [row] = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(thumperRunCommandLog)
		.where(
			and(eq(thumperRunCommandLog.runId, runId), isNull(thumperRunCommandLog.resolvedAt))
		);

	return row?.count ?? 0;
}

export async function countResolvedThumperRunCommands(
	db: DbExecutor,
	runId: string
): Promise<number> {
	const [row] = await db
		.select({
			count: sql<number>`count(*)::int`
		})
		.from(thumperRunCommandLog)
		.where(
			and(eq(thumperRunCommandLog.runId, runId), isNotNull(thumperRunCommandLog.resolvedAt))
		);

	return row?.count ?? 0;
}
