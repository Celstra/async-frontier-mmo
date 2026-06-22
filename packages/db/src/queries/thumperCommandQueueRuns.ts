import {
	COMMAND_QUEUE_RUN_BEATS,
	STARTER_QUEUE_LENGTH,
	finishCommandQueueRun,
	isProjectLedCommandQueueRun,
	recallCommandQueueRun,
	replayCommandQueueRun,
	replayCommandQueueRunToProgress,
	resolveCommandQueueRunResult,
	type CommandQueueRunState,
	type ThumperCommand
} from '@async-frontier-mmo/domain';
import type { DbExecutor } from '../client.js';
import {
	ThumperCommandLogReplayError,
	getThumperRunCommandsForReplay,
	listThumperRunCommandLogForRun,
	parseThumperCommandLogCommand
} from './thumperCommandQueueLog.js';
import {
	countResolvedCommandQueueBeats,
	parseCommandQueueRecallMarker
} from './thumperCommandQueueBeat.js';

export { isProjectLedCommandQueueRun, PROJECT_LED_COMMAND_QUEUE_RUN_MODE } from '@async-frontier-mmo/domain';

export type CommandQueueRunReplayOutcome =
	| { status: 'ended'; state: CommandQueueRunState }
	| { status: 'in_progress'; reason: string };

function parseStoredCommand(input: {
	runId: string;
	beatIndex: number;
	command: string;
}): ThumperCommand {
	const command = parseThumperCommandLogCommand(input.command);
	if (!command) {
		throw new ThumperCommandLogReplayError(
			`Invalid command "${input.command}" at beat_index ${input.beatIndex}`,
			input.runId,
			input.beatIndex,
			input.command
		);
	}
	return command;
}

async function replayRecalledCommandQueueRun(
	db: DbExecutor,
	run: {
		id: string;
		runSeed: string;
	}
): Promise<CommandQueueRunReplayOutcome> {
	const rows = await listThumperRunCommandLogForRun(db, run.id);
	const commandsByBeatIndex = rows.map((row) => ({
		beatIndex: row.beatIndex,
		command: parseStoredCommand({
			runId: run.id,
			beatIndex: row.beatIndex,
			command: row.command
		})
	}));
	const state = replayCommandQueueRunToProgress({
		runSeed: run.runSeed,
		commandsByBeatIndex,
		resolvedBeatCount: countResolvedCommandQueueBeats(rows)
	});

	if (!state.recalled) {
		const recall = recallCommandQueueRun(state);
		if (!recall.ok) {
			return { status: 'in_progress', reason: recall.reason };
		}
	}

	return { status: 'ended', state };
}

export async function replayCommandQueueRunForStoredRun(
	db: DbExecutor,
	run: {
		id: string;
		runSeed: string;
		defenseActionLog?: unknown;
	}
): Promise<CommandQueueRunReplayOutcome> {
	if (parseCommandQueueRecallMarker(run.defenseActionLog)) {
		return replayRecalledCommandQueueRun(db, run);
	}

	const requiredCommands = STARTER_QUEUE_LENGTH + COMMAND_QUEUE_RUN_BEATS - 1;
	let commands;

	try {
		commands = await getThumperRunCommandsForReplay(db, run.id);
	} catch (error) {
		if (error instanceof ThumperCommandLogReplayError) {
			return { status: 'in_progress', reason: error.message };
		}
		throw error;
	}

	if (commands.length < requiredCommands) {
		return {
			status: 'in_progress',
			reason: `Expected ${requiredCommands} queued commands, found ${commands.length}`
		};
	}

	const state = replayCommandQueueRun({
		runSeed: run.runSeed,
		commands
	});

	if (!state.ended) {
		finishCommandQueueRun(state);
	}

	return { status: 'ended', state };
}

export function isCommandQueueRunEnded(state: CommandQueueRunState): boolean {
	return state.ended;
}

export async function resolveCommandQueueRunPayload(
	db: DbExecutor,
	run: {
		id: string;
		targetResourceId: string;
		runSeed: string;
		defenseActionLog?: unknown;
	}
) {
	const replay = await replayCommandQueueRunForStoredRun(db, run);
	if (replay.status !== 'ended') {
		throw new Error(replay.reason);
	}

	const resolved = resolveCommandQueueRunResult(replay.state);

	return {
		targetResourceId: run.targetResourceId,
		projectedRecovery: resolved.recoveredQuantity,
		recoveredQuantity: resolved.recoveredQuantity,
		wasteQuantity: resolved.wasteQuantity,
		forfeitedRecovery: resolved.forfeitedLoose,
		resolutionType: resolved.resolutionType,
		recallReason: resolved.recallReason ?? undefined,
		appliedWear: 0,
		explanation: resolved.explanation
	};
}

export async function assertCommandQueueRunClaimable(
	db: DbExecutor,
	run: {
		id: string;
		runSeed: string;
		defenseActionLog?: unknown;
	}
): Promise<CommandQueueRunReplayOutcome> {
	return replayCommandQueueRunForStoredRun(db, run);
}
