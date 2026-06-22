import {
	COMMAND_QUEUE_RUN_BEATS,
	STARTER_QUEUE_LENGTH,
	canResolveNextBeat,
	forecastCommandQueueEvents,
	generateCommandQueueEvents,
	isProjectLedCommandQueueRun,
	nextCommandQueueFillBeatIndex,
	recallCommandQueueRun,
	replayCommandQueueRunToProgress,
	resolveNextBeat,
	scannerForecastQualityFromClarity,
	type CommandQueueRunState,
	type ForecastToken,
	type ScannerForecastQuality,
	type ThumperCommand
} from '@async-frontier-mmo/domain';
import { eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { getEquippedScannerForPilot } from './scannerEquipment.js';
import { getOpenThumperRunForPilot } from './thumperRuns.js';
import {
	listThumperRunCommandLogForRun,
	markThumperRunCommandLogResolved,
	updateThumperRunCommandLogCommand,
	appendThumperRunCommandLogEntryTx,
	parseThumperCommandLogCommand,
	ThumperCommandLogReplayError
} from './thumperCommandQueueLog.js';

export type CommandQueueRecallMarker = {
	commandQueueRecalledAt: string;
};

export function parseCommandQueueRecallMarker(value: unknown): Date | null {
	if (!value || typeof value !== 'object' || Array.isArray(value)) {
		return null;
	}
	const recalledAt = (value as CommandQueueRecallMarker).commandQueueRecalledAt;
	if (typeof recalledAt !== 'string') {
		return null;
	}
	const parsed = new Date(recalledAt);
	return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export type CommandQueueSlotView = {
	beatIndex: number;
	command: ThumperCommand | null;
	locked: boolean;
	isBackSlot: boolean;
};

export type CommandQueueFieldView = {
	runId: string;
	runSeed: string;
	scannerQuality: ScannerForecastQuality;
	state: CommandQueueRunState;
	forecast: ForecastToken[];
	queueSlots: CommandQueueSlotView[];
	nextFillBeatIndex: number | null;
	canAdvanceBeat: boolean;
	canClaim: boolean;
	recalled: boolean;
	resolvedBeatCount: number;
	totalBeats: number;
	queueLength: number;
	heatLimit: number;
};

type CommandQueueRunRow = {
	id: string;
	runSeed: string;
	runMode: string | null;
	claimedAt: Date | null;
	defenseActionLog: unknown;
	pilotId: string;
};

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

export async function loadCommandQueueLogRows(db: DbExecutor, runId: string) {
	return listThumperRunCommandLogForRun(db, runId);
}

export function countResolvedCommandQueueBeats(
	rows: Awaited<ReturnType<typeof loadCommandQueueLogRows>>
): number {
	return rows.filter((row) => row.resolvedAt !== null).length;
}

export function buildCommandQueueFieldView(input: {
	run: CommandQueueRunRow;
	rows: Awaited<ReturnType<typeof loadCommandQueueLogRows>>;
	scannerQuality: ScannerForecastQuality;
}): CommandQueueFieldView {
	const recalled = parseCommandQueueRecallMarker(input.run.defenseActionLog) !== null;
	const commandsByBeatIndex = input.rows.map((row) => ({
		beatIndex: row.beatIndex,
		command: parseStoredCommand({
			runId: input.run.id,
			beatIndex: row.beatIndex,
			command: row.command
		})
	}));
	const resolvedBeatCount = countResolvedCommandQueueBeats(input.rows);
	const state = replayCommandQueueRunToProgress({
		runSeed: input.run.runSeed,
		commandsByBeatIndex,
		resolvedBeatCount
	});

	if (recalled && !state.ended) {
		recallCommandQueueRun(state);
	}

	const events = generateCommandQueueEvents(input.run.runSeed);
	const forecast = forecastCommandQueueEvents({
		runSeed: input.run.runSeed,
		events,
		beat: state.currentBeat,
		queueLength: state.queueLength,
		scannerQuality: input.scannerQuality
	});

	const nextFillBeatIndex = nextCommandQueueFillBeatIndex(state);
	const visibleBeatIndices = Array.from(
		{ length: state.queueLength },
		(_, offset) => state.currentBeat + offset
	);

	const queueSlots: CommandQueueSlotView[] = visibleBeatIndices.map((beatIndex, offset) => {
		const command =
			state.queue[offset] ??
			commandsByBeatIndex.find((row) => row.beatIndex === beatIndex)?.command ??
			null;
		const stored = input.rows.find((row) => row.beatIndex === beatIndex);
		const locked = stored?.resolvedAt !== null && stored?.resolvedAt !== undefined;
		return {
			beatIndex,
			command,
			locked,
			isBackSlot: beatIndex === nextFillBeatIndex
		};
	});

	const requiredCommands = STARTER_QUEUE_LENGTH + COMMAND_QUEUE_RUN_BEATS - 1;
	const canClaim =
		state.ended &&
		!input.run.claimedAt &&
		(recalled || commandsByBeatIndex.length >= requiredCommands);

	return {
		runId: input.run.id,
		runSeed: input.run.runSeed,
		scannerQuality: input.scannerQuality,
		state,
		forecast,
		queueSlots,
		nextFillBeatIndex,
		canAdvanceBeat: canResolveNextBeat(state),
		canClaim,
		recalled: state.recalled || recalled,
		resolvedBeatCount,
		totalBeats: COMMAND_QUEUE_RUN_BEATS,
		queueLength: STARTER_QUEUE_LENGTH,
		heatLimit: 10
	};
}

async function lockOpenCommandQueueRun(
	tx: DbExecutor,
	pilotId: string
): Promise<CommandQueueRunRow | null> {
	const run = await getOpenThumperRunForPilot(tx, pilotId);
	if (!run || !isProjectLedCommandQueueRun(run.runMode)) {
		return null;
	}

	await tx
		.select({ id: thumperRuns.id })
		.from(thumperRuns)
		.where(eq(thumperRuns.id, run.id))
		.for('update');

	return run;
}

async function scannerQualityForPilot(
	db: DbExecutor,
	pilotId: string
): Promise<ScannerForecastQuality> {
	const scanner = await getEquippedScannerForPilot(db, pilotId);
	const clarity = scanner?.propertyScores.survey_clarity ?? 0;
	return scannerForecastQualityFromClarity(clarity);
}

export async function loadCommandQueueFieldViewForPilot(
	db: DbExecutor,
	pilotId: string
): Promise<CommandQueueFieldView | null> {
	const run = await getOpenThumperRunForPilot(db, pilotId);
	if (!run || !isProjectLedCommandQueueRun(run.runMode)) {
		return null;
	}

	const rows = await loadCommandQueueLogRows(db, run.id);
	const scannerQuality = await scannerQualityForPilot(db, pilotId);
	return buildCommandQueueFieldView({ run, rows, scannerQuality });
}

export type SubmitCommandQueueSlotOutcome =
	| { status: 'recorded'; beatIndex: number; view: CommandQueueFieldView }
	| { status: 'updated'; beatIndex: number; view: CommandQueueFieldView }
	| { status: 'no_open_run' }
	| { status: 'run_ended' }
	| { status: 'invalid_slot'; reason: string }
	| { status: 'invalid_command' }
	| { status: 'already_resolved' };

export async function submitCommandQueueSlotForPilot(
	db: Db,
	input: {
		pilotId: string;
		command: ThumperCommand;
		now: Date;
	}
): Promise<SubmitCommandQueueSlotOutcome> {
	return db.transaction(async (tx) => {
		const run = await lockOpenCommandQueueRun(tx, input.pilotId);
		if (!run) {
			return { status: 'no_open_run' };
		}

		if (parseCommandQueueRecallMarker(run.defenseActionLog)) {
			return { status: 'run_ended' };
		}

		const rows = await loadCommandQueueLogRows(tx, run.id);
		const scannerQuality = await scannerQualityForPilot(tx, input.pilotId);
		const viewBefore = buildCommandQueueFieldView({ run, rows, scannerQuality });

		if (viewBefore.state.ended) {
			return { status: 'run_ended' };
		}

		const targetBeatIndex =
			viewBefore.nextFillBeatIndex ??
			(viewBefore.state.queue.length === viewBefore.state.queueLength
				? viewBefore.state.currentBeat + viewBefore.state.queueLength - 1
				: null);

		if (targetBeatIndex === null) {
			return {
				status: 'invalid_slot',
				reason: 'No command slot is available to fill or edit'
			};
		}

		const existing = rows.find((row) => row.beatIndex === targetBeatIndex);
		if (existing?.resolvedAt) {
			return { status: 'already_resolved' };
		}

		if (existing) {
			const updated = await updateThumperRunCommandLogCommand(tx, {
				runId: run.id,
				beatIndex: targetBeatIndex,
				command: input.command
			});
			if (updated.status === 'already_resolved') {
				return { status: 'already_resolved' };
			}
			if (updated.status !== 'updated') {
				return { status: 'invalid_slot', reason: 'Could not update command slot' };
			}
		} else {
			const recorded = await appendThumperRunCommandLogEntryTx(tx, {
				runId: run.id,
				command: input.command,
				recordedAt: input.now,
				beatIndex: targetBeatIndex
			});
			if (recorded.status === 'invalid_command') {
				return { status: 'invalid_command' };
			}
			if (recorded.status !== 'recorded') {
				return {
					status: 'invalid_slot',
					reason: `Could not record command at beat_index ${targetBeatIndex}`
				};
			}
		}

		const refreshedRows = await loadCommandQueueLogRows(tx, run.id);
		const view = buildCommandQueueFieldView({
			run,
			rows: refreshedRows,
			scannerQuality
		});

		return existing
			? { status: 'updated', beatIndex: targetBeatIndex, view }
			: { status: 'recorded', beatIndex: targetBeatIndex, view };
	});
}

export type AdvanceCommandQueueBeatOutcome =
	| { status: 'advanced'; beatIndex: number; command: ThumperCommand; view: CommandQueueFieldView }
	| { status: 'no_open_run' }
	| { status: 'run_ended' }
	| { status: 'not_ready'; reason: string };

export async function advanceCommandQueueBeatForPilot(
	db: Db,
	input: {
		pilotId: string;
		now: Date;
	}
): Promise<AdvanceCommandQueueBeatOutcome> {
	return db.transaction(async (tx) => {
		const run = await lockOpenCommandQueueRun(tx, input.pilotId);
		if (!run) {
			return { status: 'no_open_run' };
		}

		if (parseCommandQueueRecallMarker(run.defenseActionLog)) {
			return { status: 'run_ended' };
		}

		const rows = await loadCommandQueueLogRows(tx, run.id);
		const scannerQuality = await scannerQualityForPilot(tx, input.pilotId);
		const viewBefore = buildCommandQueueFieldView({ run, rows, scannerQuality });

		if (viewBefore.state.ended) {
			return { status: 'run_ended' };
		}

		if (!viewBefore.canAdvanceBeat) {
			return {
				status: 'not_ready',
				reason: 'Fill every command slot before advancing the next beat'
			};
		}

		const beatIndex = viewBefore.state.currentBeat;
		const commandRow = rows.find((row) => row.beatIndex === beatIndex);
		const command = commandRow
			? parseStoredCommand({
					runId: run.id,
					beatIndex,
					command: commandRow.command
				})
			: null;
		if (!command) {
			return {
				status: 'not_ready',
				reason: `Missing queued command for beat ${beatIndex}`
			};
		}

		const events = generateCommandQueueEvents(run.runSeed);
		const resolution = resolveNextBeat(viewBefore.state, events[beatIndex]!);
		if (!resolution.ok) {
			return { status: 'not_ready', reason: resolution.reason };
		}

		const marked = await markThumperRunCommandLogResolved(tx, {
			runId: run.id,
			beatIndex,
			resolvedAt: input.now
		});
		if (marked.status !== 'resolved' && marked.status !== 'already_resolved') {
			return { status: 'not_ready', reason: 'Could not mark beat as resolved' };
		}

		const refreshedRows = await loadCommandQueueLogRows(tx, run.id);
		const view = buildCommandQueueFieldView({
			run,
			rows: refreshedRows,
			scannerQuality
		});

		return {
			status: 'advanced',
			beatIndex,
			command: resolution.command,
			view
		};
	});
}

export type RecallCommandQueueRunOutcome =
	| { status: 'recalled'; view: CommandQueueFieldView }
	| { status: 'no_open_run' }
	| { status: 'run_ended'; reason: string };

export async function recallCommandQueueRunForPilot(
	db: Db,
	input: {
		pilotId: string;
		now: Date;
	}
): Promise<RecallCommandQueueRunOutcome> {
	return db.transaction(async (tx) => {
		const run = await lockOpenCommandQueueRun(tx, input.pilotId);
		if (!run) {
			return { status: 'no_open_run' };
		}

		if (parseCommandQueueRecallMarker(run.defenseActionLog)) {
			return { status: 'run_ended', reason: 'Run already recalled' };
		}

		const rows = await loadCommandQueueLogRows(tx, run.id);
		const scannerQuality = await scannerQualityForPilot(tx, input.pilotId);
		const viewBefore = buildCommandQueueFieldView({
			run,
			rows,
			scannerQuality
		});

		if (viewBefore.state.ended && !viewBefore.state.recalled) {
			return { status: 'run_ended', reason: 'Run already completed' };
		}

		const recall = recallCommandQueueRun(viewBefore.state);
		if (!recall.ok) {
			return { status: 'run_ended', reason: recall.reason };
		}

		const marker: CommandQueueRecallMarker = {
			commandQueueRecalledAt: input.now.toISOString()
		};

		await tx
			.update(thumperRuns)
			.set({ defenseActionLog: marker })
			.where(eq(thumperRuns.id, run.id));

		const recalledRun = { ...run, defenseActionLog: marker };
		const view = buildCommandQueueFieldView({
			run: recalledRun,
			rows,
			scannerQuality
		});

		return { status: 'recalled', view };
	});
}
