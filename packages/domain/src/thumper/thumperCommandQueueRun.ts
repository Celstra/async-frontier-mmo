import { SeededRng } from './thumperDefenseRun.js';

export const STARTER_QUEUE_LENGTH = 2;
export const RUN_BEATS = 18;
export const STARTING_HULL = 55;
export const STARTING_HEAT = 3;
export const HEAT_LIMIT = 10;

export const THUMPER_COMMANDS = ['drill', 'bank', 'brace', 'vent'] as const;
export type ThumperCommand = (typeof THUMPER_COMMANDS)[number];

export const COMMAND_QUEUE_EVENT_KINDS = ['cargo', 'heat', 'hull', 'raid'] as const;
export type CommandQueueEventKind = (typeof COMMAND_QUEUE_EVENT_KINDS)[number];

export const SCANNER_FORECAST_QUALITIES = ['poor', 'basic', 'good'] as const;
export type ScannerForecastQuality = (typeof SCANNER_FORECAST_QUALITIES)[number];

export type CommandQueueFieldEvent = {
	kind: CommandQueueEventKind;
	amount: number;
};

export type ForecastToken = {
	kind: CommandQueueEventKind | null;
	amount: number | null;
};

export type QueuedCommand = {
	beat: number;
	command: ThumperCommand;
};

export type CommandQueueRunState = {
	currentBeat: number;
	totalBeats: number;
	queueLength: number;
	queue: ThumperCommand[];
	secured: number;
	loose: number;
	hull: number;
	heat: number;
	guard: number;
	lost: number;
	surgeCount: number;
	recallForfeitedLoose: number;
	ended: boolean;
	recalled: boolean;
};

export type CommandQueueRunResult = {
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedLoose: number;
	explanation: string;
	resolutionType: 'command_queue_completed' | 'command_queue_recalled';
	recallReason: string | null;
	hullRemaining: number;
	heatRemaining: number;
	surgeCount: number;
};

function forecastRevealRng(runSeed: string, eventBeat: number): SeededRng {
	return new SeededRng(`${runSeed}:forecast:${eventBeat}`);
}

export function createCommandQueueRunState(input?: {
	queueLength?: number;
	totalBeats?: number;
	startingHull?: number;
	startingHeat?: number;
	startingLoose?: number;
}): CommandQueueRunState {
	return {
		currentBeat: 0,
		totalBeats: input?.totalBeats ?? RUN_BEATS,
		queueLength: input?.queueLength ?? STARTER_QUEUE_LENGTH,
		queue: [],
		secured: 0,
		loose: input?.startingLoose ?? 0,
		hull: input?.startingHull ?? STARTING_HULL,
		heat: input?.startingHeat ?? STARTING_HEAT,
		guard: 0,
		lost: 0,
		surgeCount: 0,
		recallForfeitedLoose: 0,
		ended: false,
		recalled: false
	};
}

export function generateCommandQueueEvents(
	runSeed: string,
	beats: number = RUN_BEATS
): CommandQueueFieldEvent[] {
	const rng = new SeededRng(`${runSeed}:events`);
	const events: CommandQueueFieldEvent[] = [];
	let heatBias = 0;

	for (let beat = 0; beat < beats; beat += 1) {
		let kind: CommandQueueEventKind;
		const roll = rng.next();

		if ([4, 9, 14].includes(beat) && rng.next() < 0.62) {
			kind = rng.choice(['hull', 'raid', 'heat'] as const);
		} else if (roll < 0.38) {
			kind = 'cargo';
		} else if (roll < 0.62) {
			kind = 'heat';
		} else if (roll < 0.82) {
			kind = 'hull';
		} else {
			kind = 'raid';
		}

		let amount: number;
		if (kind === 'cargo') {
			amount = rng.nextInt(2, 4);
			heatBias = Math.max(0, heatBias - 1);
		} else if (kind === 'heat') {
			amount = rng.nextInt(2 + heatBias, 4 + heatBias);
			heatBias = Math.min(2, heatBias + 1);
		} else {
			amount = rng.nextInt(1, 3);
		}

		events.push({ kind, amount });
	}

	return events;
}

function revealEvent(
	event: CommandQueueFieldEvent,
	scannerQuality: ScannerForecastQuality,
	distance: number,
	rng: SeededRng
): ForecastToken {
	if (distance === 0) {
		return { kind: event.kind, amount: event.amount };
	}

	const kindChanceByScanner: Record<ScannerForecastQuality, Record<number, number>> = {
		poor: { 0: 0.75, 1: 0.45, 2: 0.25, 3: 0.15 },
		basic: { 0: 0.9, 1: 0.7, 2: 0.45, 3: 0.3 },
		good: { 0: 1.0, 1: 0.9, 2: 0.72, 3: 0.55 }
	};
	const amountChanceByScanner: Record<ScannerForecastQuality, Record<number, number>> = {
		poor: { 0: 0.2, 1: 0.08, 2: 0.0, 3: 0.0 },
		basic: { 0: 0.55, 1: 0.3, 2: 0.12, 3: 0.05 },
		good: { 0: 0.85, 1: 0.65, 2: 0.4, 3: 0.2 }
	};

	const kindChance = kindChanceByScanner[scannerQuality][distance] ?? 0.1;
	const amountChance = amountChanceByScanner[scannerQuality][distance] ?? 0.0;

	if (rng.next() > kindChance) {
		return { kind: null, amount: null };
	}
	if (rng.next() > amountChance) {
		return { kind: event.kind, amount: null };
	}
	return { kind: event.kind, amount: event.amount };
}

export function forecastCommandQueueEvents(input: {
	runSeed: string;
	events: CommandQueueFieldEvent[];
	beat: number;
	queueLength: number;
	scannerQuality: ScannerForecastQuality;
}): ForecastToken[] {
	const tokens: ForecastToken[] = [];

	for (let offset = 0; offset < input.queueLength; offset += 1) {
		const index = input.beat + offset;
		if (index >= input.events.length) {
			tokens.push({ kind: null, amount: null });
			continue;
		}
		tokens.push(
			revealEvent(
				input.events[index]!,
				input.scannerQuality,
				offset,
				forecastRevealRng(input.runSeed, index)
			)
		);
	}

	return tokens;
}

export function queueCommand(
	state: CommandQueueRunState,
	command: ThumperCommand
): { ok: true } | { ok: false; reason: string } {
	if (state.ended) {
		return { ok: false, reason: 'Run has ended' };
	}
	const maxQueueDepth = visibleCommandQueueSlotCount(state);
	if (state.queue.length >= maxQueueDepth) {
		return { ok: false, reason: 'Command queue is full' };
	}

	state.queue.push(command);
	return { ok: true };
}

/** Last beat index that can still resolve a queued command. */
export function lastResolvableCommandBeatIndex(totalBeats: number): number {
	return totalBeats - 1;
}

/** Visible queue rows near run end shrink so beats past the final resolution are not shown. */
export function visibleCommandQueueSlotCount(state: CommandQueueRunState): number {
	if (state.ended || state.recalled) {
		return 0;
	}
	return Math.max(0, Math.min(state.queueLength, state.totalBeats - state.currentBeat));
}

export function canResolveNextBeat(state: CommandQueueRunState): boolean {
	const requiredQueueDepth = visibleCommandQueueSlotCount(state);
	return (
		!state.ended &&
		!state.recalled &&
		requiredQueueDepth > 0 &&
		state.queue.length === requiredQueueDepth &&
		state.currentBeat < state.totalBeats
	);
}

function applyCommand(state: CommandQueueRunState, command: ThumperCommand): void {
	if (command === 'drill') {
		state.loose += 3;
		state.heat += 2;
		return;
	}
	if (command === 'bank') {
		state.secured += state.loose;
		state.loose = 0;
		return;
	}
	if (command === 'brace') {
		state.guard = 2;
		return;
	}
	if (command === 'vent') {
		state.heat = Math.max(0, state.heat - 3);
		if (state.loose > 0) {
			state.loose -= 1;
			state.lost += 1;
		}
	}
}

function applyFieldEvent(state: CommandQueueRunState, event: CommandQueueFieldEvent): void {
	if (event.kind === 'cargo') {
		state.loose += event.amount;
	} else if (event.kind === 'heat') {
		state.heat += event.amount;
	} else if (event.kind === 'hull' || event.kind === 'raid') {
		if (state.guard > 0) {
			state.guard -= 1;
		} else if (event.kind === 'hull') {
			state.hull -= event.amount;
		} else {
			const loss = Math.min(state.loose, event.amount);
			state.loose -= loss;
			state.lost += loss;
			if (loss < event.amount) {
				state.hull -= 1;
			}
		}
	}

	applyHeatSurgeIfNeeded(state);
}

function applyHeatSurgeIfNeeded(state: CommandQueueRunState): void {
	if (state.heat < HEAT_LIMIT) {
		return;
	}

	state.surgeCount += 1;
	state.hull -= 2;
	const loss = Math.min(state.loose, 2);
	state.loose -= loss;
	state.lost += loss;
	state.heat = 5;
}

export function resolveNextBeat(
	state: CommandQueueRunState,
	event: CommandQueueFieldEvent
): { ok: true; command: ThumperCommand } | { ok: false; reason: string } {
	if (!canResolveNextBeat(state)) {
		return { ok: false, reason: 'Next beat is not ready to resolve' };
	}

	const command = state.queue.shift()!;
	applyCommand(state, command);
	applyFieldEvent(state, event);
	state.currentBeat += 1;

	if (state.currentBeat >= state.totalBeats) {
		finishCommandQueueRun(state);
	}

	return { ok: true, command };
}

export type CommandQueueBeatReadout = {
	commandLine: string;
	fieldLine: string;
	heatLine: string;
};

export function buildCommandQueueBeatReadout(input: {
	command: ThumperCommand;
	event: CommandQueueFieldEvent;
	before: CommandQueueRunState;
	after: CommandQueueRunState;
	heatLimit?: number;
}): CommandQueueBeatReadout {
	const heatLimit = input.heatLimit ?? HEAT_LIMIT;
	const beforeFieldEvent = cloneCommandQueueRunState(input.before);
	applyCommand(beforeFieldEvent, input.command);
	return {
		commandLine: formatCommandQueueBeatCommandLine(input.command),
		fieldLine: formatCommandQueueBeatFieldLine(input.event, beforeFieldEvent),
		heatLine: formatCommandQueueBeatHeatLine(input.before, input.after, heatLimit)
	};
}

function formatCommandQueueBeatCommandLine(command: ThumperCommand): string {
	if (command === 'drill') return 'DRILL loose +3 / heat +2';
	if (command === 'bank') return 'BANK loose -> secured';
	if (command === 'brace') return 'BRACE guard =2';
	return 'VENT heat -3 / loose -1';
}

function formatCommandQueueBeatFieldLine(
	event: CommandQueueFieldEvent,
	beforeFieldEvent: CommandQueueRunState
): string {
	if (event.kind === 'cargo') {
		return `FIELD LOOSE +${event.amount}`;
	}
	if (event.kind === 'heat') {
		return `FIELD HEAT +${event.amount}`;
	}
	if (event.kind === 'hull') {
		if (beforeFieldEvent.guard > 0) {
			return 'FIELD HULL blocked / guard -1';
		}
		return `FIELD HULL hull -${event.amount}`;
	}

	if (beforeFieldEvent.guard > 0) {
		return 'FIELD RAID blocked / guard -1';
	}

	const looseLoss = Math.min(beforeFieldEvent.loose, event.amount);
	if (looseLoss === event.amount) {
		return `FIELD RAID loose -${looseLoss}`;
	}
	if (looseLoss > 0) {
		return `FIELD RAID loose -${looseLoss} / hull -1`;
	}
	return 'FIELD RAID hull -1';
}

function formatCommandQueueBeatHeatLine(
	before: CommandQueueRunState,
	after: CommandQueueRunState,
	heatLimit: number
): string {
	const surgeFired = after.surgeCount > before.surgeCount;
	const surgeSuffix = surgeFired ? ' / surge fired' : '';
	return `Heat ${after.heat}/${heatLimit}${surgeSuffix}`;
}

export function cloneCommandQueueRunState(state: CommandQueueRunState): CommandQueueRunState {
	return {
		...state,
		queue: [...state.queue]
	};
}

/** Applies one command + field event without advancing beat or shifting the queue. */
export function applyCommandQueueBeatEffects(
	state: CommandQueueRunState,
	command: ThumperCommand,
	event: CommandQueueFieldEvent
): void {
	applyCommand(state, command);
	applyFieldEvent(state, event);
}

export function finishCommandQueueRun(state: CommandQueueRunState): void {
	if (state.ended) {
		return;
	}

	const claimLoose = Math.floor(state.loose * 0.45);
	state.secured += claimLoose;
	state.lost += state.loose - claimLoose;
	state.loose = 0;
	state.ended = true;
}

function forfeitLooseCargoOnRecall(state: CommandQueueRunState): void {
	if (state.loose <= 0) {
		return;
	}

	state.recallForfeitedLoose = state.loose;
	state.lost += state.loose;
	state.loose = 0;
}

export function recallCommandQueueRun(
	state: CommandQueueRunState
): { ok: true } | { ok: false; reason: string } {
	if (state.ended) {
		return { ok: false, reason: 'Run has ended' };
	}

	forfeitLooseCargoOnRecall(state);
	state.recalled = true;
	state.ended = true;
	return { ok: true };
}

export function replayCommandQueueRun(input: {
	runSeed: string;
	commands: ThumperCommand[];
	events?: CommandQueueFieldEvent[];
	queueLength?: number;
}): CommandQueueRunState {
	const queueLength = input.queueLength ?? STARTER_QUEUE_LENGTH;
	const events = input.events ?? generateCommandQueueEvents(input.runSeed);
	const state = createCommandQueueRunState({ queueLength });
	const requiredCommands = state.totalBeats;
	let commandIndex = 0;

	const takeCommand = (): ThumperCommand => {
		const command = input.commands[commandIndex];
		if (!command) {
			throw new Error(
				`Expected at least ${requiredCommands} commands, received ${input.commands.length}`
			);
		}
		commandIndex += 1;
		return command;
	};

	const fillVisibleQueue = (): void => {
		while (nextCommandQueueFillBeatIndex(state) !== null && commandIndex < requiredCommands) {
			queueCommand(state, takeCommand());
		}
	};

	fillVisibleQueue();

	for (let beat = 0; beat < state.totalBeats && !state.ended; beat += 1) {
		resolveNextBeat(state, events[beat]!);
		fillVisibleQueue();
	}

	return state;
}

export function resolveCommandQueueRunResult(
	state: CommandQueueRunState
): CommandQueueRunResult {
	if (!state.ended) {
		throw new Error('Command queue run has not ended');
	}

	const recoveredQuantity = Math.max(0, Math.floor(state.secured));
	const wasteQuantity = Math.max(0, Math.floor(state.lost));
	const forfeitedLoose = Math.max(0, Math.floor(state.recallForfeitedLoose));
	const resolutionType = state.recalled
		? 'command_queue_recalled'
		: 'command_queue_completed';

	const explanation = [
		`Command queue run secured ${recoveredQuantity}u.`,
		wasteQuantity > 0 ? `${wasteQuantity}u lost to field pressure.` : null,
		forfeitedLoose > 0 ? `${forfeitedLoose}u forfeited loose cargo on recall.` : null,
		state.surgeCount > 0 ? `${state.surgeCount} heat surge(s) fired.` : null,
		state.recalled ? 'Run ended early on recall.' : 'Run completed after all beats.'
	]
		.filter(Boolean)
		.join(' ');

	return {
		recoveredQuantity,
		wasteQuantity,
		forfeitedLoose,
		explanation,
		resolutionType,
		recallReason: state.recalled ? 'Player recalled the thumper run.' : null,
		hullRemaining: state.hull,
		heatRemaining: state.heat,
		surgeCount: state.surgeCount
	};
}

/** Beat index for the next unfilled queue slot, or null when the queue is full or the run ended. */
export function nextCommandQueueFillBeatIndex(state: CommandQueueRunState): number | null {
	if (state.ended || state.recalled) {
		return null;
	}
	const visibleCount = visibleCommandQueueSlotCount(state);
	if (visibleCount === 0 || state.queue.length >= visibleCount) {
		return null;
	}
	const fillIndex = state.currentBeat + state.queue.length;
	if (fillIndex > lastResolvableCommandBeatIndex(state.totalBeats)) {
		return null;
	}
	return fillIndex;
}

function commandAtBeat(
	commandsByBeatIndex: ReadonlyMap<number, ThumperCommand>,
	beatIndex: number
): ThumperCommand | undefined {
	return commandsByBeatIndex.get(beatIndex);
}

/**
 * Replays a command-queue run up to the number of beats already resolved in persistence.
 * Unresolved stored commands refill visible queue slots for the FIELD view model.
 */
export function replayCommandQueueRunToProgress(input: {
	runSeed: string;
	commandsByBeatIndex: ReadonlyArray<{ beatIndex: number; command: ThumperCommand }>;
	resolvedBeatCount: number;
	events?: CommandQueueFieldEvent[];
	queueLength?: number;
}): CommandQueueRunState {
	const queueLength = input.queueLength ?? STARTER_QUEUE_LENGTH;
	const events = input.events ?? generateCommandQueueEvents(input.runSeed);
	const commandsByBeatIndex = new Map(
		input.commandsByBeatIndex.map((row) => [row.beatIndex, row.command])
	);
	const state = createCommandQueueRunState({ queueLength });

	const refillQueueFromStoredCommands = () => {
		while (!state.ended) {
			const fillIndex = nextCommandQueueFillBeatIndex(state);
			if (fillIndex === null) {
				break;
			}
			const command = commandAtBeat(commandsByBeatIndex, fillIndex);
			if (!command) {
				break;
			}
			queueCommand(state, command);
		}
	};

	refillQueueFromStoredCommands();

	const beatsToResolve = Math.min(
		Math.max(0, input.resolvedBeatCount),
		state.totalBeats
	);

	for (let beat = 0; beat < beatsToResolve && !state.ended; beat += 1) {
		if (!canResolveNextBeat(state)) {
			break;
		}
		const resolution = resolveNextBeat(state, events[beat]!);
		if (!resolution.ok) {
			break;
		}
		if (!state.ended && beat < state.totalBeats - 1) {
			refillQueueFromStoredCommands();
		}
	}

	refillQueueFromStoredCommands();
	return state;
}

export function scannerForecastQualityFromClarity(score: number): ScannerForecastQuality {
	if (score >= 70) {
		return 'good';
	}
	if (score >= 40) {
		return 'basic';
	}
	return 'poor';
}
