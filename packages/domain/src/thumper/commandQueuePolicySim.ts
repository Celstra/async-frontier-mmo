import {
	MEDIUM_COMMAND_QUEUE_SLOT_LENGTH,
	type CommandQueueSlotLength
} from './commandQueueSlotLength.js';
import {
	commandQueueBeatLossEquivalent,
	commandQueueRepairDebt,
	scoreCommandQueueRunState
} from './commandQueueLengthTuning.js';
import { SeededRng } from './thumperDefenseRun.js';
import {
	STARTING_HULL,
	THUMPER_COMMANDS,
	cloneCommandQueueRunState,
	applyCommandQueueBeatEffects,
	createCommandQueueRunState,
	forecastCommandQueueEvents,
	generateCommandQueueEvents,
	queueCommand,
	resolveNextBeat,
	visibleCommandQueueSlotCount,
	type CommandQueueFieldEvent,
	type CommandQueueRunState,
	type ForecastToken,
	type ScannerForecastQuality,
	type ThumperCommand
} from './thumperCommandQueueRun.js';

export type CommandQueuePolicyName =
	| 'random'
	| 'greedy'
	| 'event_matcher'
	| 'cautious'
	| 'planner'
	| 'oracle';

export const COMMAND_QUEUE_POLICY_NAMES: CommandQueuePolicyName[] = [
	'random',
	'greedy',
	'event_matcher',
	'cautious',
	'planner',
	'oracle'
];

const SCANNER_QUALITIES: ScannerForecastQuality[] = ['poor', 'basic', 'good'];

const PLANNER_TIE_BREAK: ThumperCommand[] = ['bank', 'brace', 'vent', 'drill'];

export type CommandQueuePolicyRunResult = {
	policy: CommandQueuePolicyName;
	scannerQuality: ScannerForecastQuality;
	queueLength: CommandQueueSlotLength;
	score: number;
	recovered: number;
	waste: number;
	hull: number;
	surges: number;
	repairDebt: number;
	beatLossEquivalent: number;
	hullDebt: number;
	commandCounts: Record<ThumperCommand, number>;
	unknownForecastRatio: number;
};

export type CommandQueuePolicyBand = {
	name: CommandQueuePolicyName;
	scannerQuality: ScannerForecastQuality;
	queueLength: CommandQueueSlotLength;
	p10Score: number;
	medianScore: number;
	p90Score: number;
	medianRecovered: number;
	medianWaste: number;
	medianHull: number;
	medianSurges: number;
	medianRepairDebt: number;
	medianBeatLossEquivalent: number;
	medianHullDebt: number;
	topCommandSharePct: number;
	medianUnknownForecastPct: number;
	sampleSize: number;
};

export type HullDamageModelGuidance = {
	queueLength: CommandQueueSlotLength;
	medianPlannerHullDebt: number;
	medianGreedyHullDebt: number;
	medianPlannerBeatLossEquivalent: number;
	medianGreedyBeatLossEquivalent: number;
	hullDebtShareOfPlannerRepairDebt: number;
	suggestedFollowUp: 'part_wear' | 'repair_cost' | 'beat_shortening' | 'defer';
	rationale: string;
};

export type CommandQueuePolicyReport = {
	queueLength: CommandQueueSlotLength;
	policies: CommandQueuePolicyBand[];
	hullDamageGuidance: HullDamageModelGuidance;
	gateFailures: string[];
};

function percentile(sorted: number[], ratio: number): number {
	if (sorted.length === 0) {
		return 0;
	}
	const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
	return sorted[index]!;
}

function medianOf(values: number[]): number {
	return percentile(
		[...values].sort((left, right) => left - right),
		0.5
	);
}

function runSeedsForPolicySim(sampleSize: number, baseSeed: number): string[] {
	return Array.from({ length: sampleSize }, (_, index) => `command-queue-policy:${baseSeed + index}`);
}

function emptyCommandCounts(): Record<ThumperCommand, number> {
	return {
		drill: 0,
		bank: 0,
		brace: 0,
		vent: 0
	};
}

function unknownEventForPlanning(): CommandQueueFieldEvent {
	return { kind: 'heat', amount: 2 };
}

function tokenToPlanningEvent(token: ForecastToken): CommandQueueFieldEvent {
	if (!token.kind) {
		return unknownEventForPlanning();
	}
	const defaultAmount = token.kind === 'cargo' || token.kind === 'heat' ? 3 : 2;
	return {
		kind: token.kind,
		amount: token.amount ?? defaultAmount
	};
}

function evaluatePlannerState(state: CommandQueueRunState): number {
	return (
		state.secured +
		state.loose * 0.35 +
		Math.max(0, state.hull - 45) * 0.1 -
		Math.max(0, 45 - state.hull) * 1.2 -
		state.heat * 0.24 -
		state.surgeCount * 3.5 -
		state.lost * 0.4
	);
}

function rolloutScore(input: {
	state: CommandQueueRunState;
	queue: ThumperCommand[];
	forecast: ForecastToken[];
	candidate: ThumperCommand;
}): number {
	const sim = cloneCommandQueueRunState(input.state);
	const commands = [...input.queue, input.candidate];

	for (let offset = 0; offset < commands.length; offset += 1) {
		const event =
			offset < input.forecast.length
				? tokenToPlanningEvent(input.forecast[offset]!)
				: unknownEventForPlanning();
		applyCommandQueueBeatEffects(sim, commands[offset]!, event);
	}

	return evaluatePlannerState(sim);
}

function buildForecast(input: {
	runSeed: string;
	events: CommandQueueFieldEvent[];
	state: CommandQueueRunState;
	scannerQuality: ScannerForecastQuality;
	policy: CommandQueuePolicyName;
}): ForecastToken[] {
	const visibleCount = visibleCommandQueueSlotCount(input.state);
	if (input.policy === 'oracle') {
		return Array.from({ length: visibleCount }, (_, offset) => {
			const event = input.events[input.state.currentBeat + offset];
			return event
				? { kind: event.kind, amount: event.amount }
				: { kind: null, amount: null };
		});
	}

	return forecastCommandQueueEvents({
		runSeed: input.runSeed,
		events: input.events,
		beat: input.state.currentBeat,
		queueLength: visibleCount,
		scannerQuality: input.scannerQuality
	});
}

function chooseCommand(input: {
	policy: CommandQueuePolicyName;
	state: CommandQueueRunState;
	queue: ThumperCommand[];
	forecast: ForecastToken[];
	policyRng: SeededRng;
}): ThumperCommand {
	const candidateOffset = Math.min(input.queue.length, Math.max(0, input.forecast.length - 1));
	const farToken = input.forecast[candidateOffset] ?? { kind: null, amount: null };

	if (input.policy === 'random') {
		return input.policyRng.choice(THUMPER_COMMANDS);
	}

	if (input.policy === 'greedy') {
		if (input.state.heat >= 9) {
			return 'vent';
		}
		if (input.state.loose >= 4) {
			return 'bank';
		}
		return 'drill';
	}

	if (input.policy === 'event_matcher') {
		if (farToken.kind === 'hull' || farToken.kind === 'raid') {
			return 'brace';
		}
		if (farToken.kind === 'heat') {
			return 'vent';
		}
		if (farToken.kind === 'cargo') {
			return 'bank';
		}
		return 'drill';
	}

	if (input.policy === 'cautious') {
		const visibleKinds = new Set(
			input.forecast.map((token) => token.kind).filter((kind): kind is NonNullable<typeof kind> => kind !== null)
		);
		if (input.state.heat >= 7 || visibleKinds.has('heat')) {
			return 'vent';
		}
		if (visibleKinds.has('hull') || visibleKinds.has('raid')) {
			return 'brace';
		}
		if (input.state.loose >= 3) {
			return 'bank';
		}
		return 'drill';
	}

	if (input.policy === 'planner' || input.policy === 'oracle') {
		const scores = Object.fromEntries(
			THUMPER_COMMANDS.map((command) => [
				command,
				rolloutScore({
					state: input.state,
					queue: input.queue,
					forecast: input.forecast,
					candidate: command
				})
			])
		) as Record<ThumperCommand, number>;

		if (input.policy === 'oracle') {
			return THUMPER_COMMANDS.reduce((best, command) =>
				scores[command]! > scores[best]! ? command : best
			);
		}

		const bestScore = Math.max(...THUMPER_COMMANDS.map((command) => scores[command]!));
		const tied = PLANNER_TIE_BREAK.filter((command) => scores[command] === bestScore);
		return tied[0] ?? 'bank';
	}

	throw new Error(`Unknown policy: ${input.policy satisfies never}`);
}

function hullDebtFromState(state: CommandQueueRunState): number {
	return Math.max(0, STARTING_HULL - state.hull) * 0.65;
}

export function simulateCommandQueuePolicyRun(input: {
	runSeed: string;
	queueLength: CommandQueueSlotLength;
	scannerQuality: ScannerForecastQuality;
	policy: CommandQueuePolicyName;
}): CommandQueuePolicyRunResult {
	const events = generateCommandQueueEvents(input.runSeed);
	const state = createCommandQueueRunState({ queueLength: input.queueLength });
	const policyRng = new SeededRng(`${input.runSeed}:policy:${input.policy}`);
	const commandCounts = emptyCommandCounts();
	let unknownForecast = 0;
	let forecastTotal = 0;

	const fillNextCommand = () => {
		const visibleCount = visibleCommandQueueSlotCount(state);
		if (visibleCount === 0 || state.queue.length >= visibleCount) {
			return;
		}

		const forecast = buildForecast({
			runSeed: input.runSeed,
			events,
			state,
			scannerQuality: input.scannerQuality,
			policy: input.policy
		});
		unknownForecast += forecast.filter((token) => token.kind === null).length;
		forecastTotal += forecast.length;

		const command = chooseCommand({
			policy: input.policy,
			state,
			queue: [...state.queue],
			forecast,
			policyRng
		});
		const queued = queueCommand(state, command);
		if (!queued.ok) {
			throw new Error(`Policy ${input.policy} could not queue command: ${queued.reason}`);
		}
	};

	while (visibleCommandQueueSlotCount(state) > 0 && state.queue.length < visibleCommandQueueSlotCount(state)) {
		fillNextCommand();
	}

	for (let beat = 0; beat < state.totalBeats && !state.ended; beat += 1) {
		const resolution = resolveNextBeat(state, events[beat]!);
		if (!resolution.ok) {
			throw new Error(`Policy ${input.policy} stalled at beat ${beat}: ${resolution.reason}`);
		}
		commandCounts[resolution.command] += 1;

		if (!state.ended && beat < state.totalBeats - 1) {
			fillNextCommand();
		}
	}

	const repairDebt = commandQueueRepairDebt(state);
	return {
		policy: input.policy,
		scannerQuality: input.scannerQuality,
		queueLength: input.queueLength,
		score: scoreCommandQueueRunState(state),
		recovered: state.secured,
		waste: state.lost,
		hull: state.hull,
		surges: state.surgeCount,
		repairDebt,
		beatLossEquivalent: commandQueueBeatLossEquivalent(state),
		hullDebt: hullDebtFromState(state),
		commandCounts,
		unknownForecastRatio: forecastTotal === 0 ? 0 : unknownForecast / forecastTotal
	};
}

function topCommandSharePct(runs: CommandQueuePolicyRunResult[]): number {
	const totals = emptyCommandCounts();
	for (const run of runs) {
		for (const command of THUMPER_COMMANDS) {
			totals[command] += run.commandCounts[command];
		}
	}
	const totalCommands = THUMPER_COMMANDS.reduce((sum, command) => sum + totals[command], 0);
	if (totalCommands === 0) {
		return 0;
	}
	const top = Math.max(...THUMPER_COMMANDS.map((command) => totals[command]));
	return (top / totalCommands) * 100;
}

function buildHullDamageGuidance(input: {
	queueLength: CommandQueueSlotLength;
	policies: CommandQueuePolicyBand[];
}): HullDamageModelGuidance {
	const planner = input.policies.find(
		(policy) => policy.name === 'planner' && policy.scannerQuality === 'basic'
	);
	const greedy = input.policies.find(
		(policy) => policy.name === 'greedy' && policy.scannerQuality === 'basic'
	);
	if (!planner || !greedy) {
		return {
			queueLength: input.queueLength,
			medianPlannerHullDebt: 0,
			medianGreedyHullDebt: 0,
			medianPlannerBeatLossEquivalent: 0,
			medianGreedyBeatLossEquivalent: 0,
			hullDebtShareOfPlannerRepairDebt: 0,
			suggestedFollowUp: 'defer',
			rationale: 'Missing planner or greedy basic-scanner bands for hull guidance.'
		};
	}

	const hullDebtShare =
		planner.medianRepairDebt <= 0
			? 0
			: planner.medianHullDebt / planner.medianRepairDebt;
	const beatLossGap = greedy.medianBeatLossEquivalent - planner.medianBeatLossEquivalent;
	const hullDebtGap = greedy.medianHullDebt - planner.medianHullDebt;

	let suggestedFollowUp: HullDamageModelGuidance['suggestedFollowUp'] = 'defer';
	let rationale = 'Hull damage signal is mixed; keep sim-only debt until human q3 playtests land.';

	if (planner.medianBeatLossEquivalent >= 2 && beatLossGap >= 1) {
		suggestedFollowUp = 'beat_shortening';
		rationale =
			'Greedy policies rack up more beat-loss equivalent than planner; model hull damage as future run capacity loss before wiring part wear.';
	} else if (hullDebtShare >= 0.45 && hullDebtGap >= 4) {
		suggestedFollowUp = 'repair_cost';
		rationale =
			'Hull debt dominates planner repair debt and greedy runs pay more hull debt; a repair-cost sink is the clearer first live hook.';
	} else if (planner.medianHullDebt >= 6) {
		suggestedFollowUp = 'part_wear';
		rationale =
			'Sustained hull loss appears across planner runs; part-wear on the reinforced hull plate is the most legible carry-forward penalty.';
	}

	return {
		queueLength: input.queueLength,
		medianPlannerHullDebt: planner.medianHullDebt,
		medianGreedyHullDebt: greedy.medianHullDebt,
		medianPlannerBeatLossEquivalent: planner.medianBeatLossEquivalent,
		medianGreedyBeatLossEquivalent: greedy.medianBeatLossEquivalent,
		hullDebtShareOfPlannerRepairDebt: hullDebtShare,
		suggestedFollowUp,
		rationale
	};
}

function evaluatePolicyGates(input: {
	queueLength: CommandQueueSlotLength;
	policies: CommandQueuePolicyBand[];
}): string[] {
	const gateFailures: string[] = [];
	const minPlannerRandomEdge = input.queueLength === 3 ? 2 : 3;
	const maxTopCommandSharePct = 60;

	for (const scannerQuality of SCANNER_QUALITIES) {
		const planner = input.policies.find(
			(policy) => policy.name === 'planner' && policy.scannerQuality === scannerQuality
		);
		const randomPolicy = input.policies.find(
			(policy) => policy.name === 'random' && policy.scannerQuality === scannerQuality
		);
		const matcher = input.policies.find(
			(policy) => policy.name === 'event_matcher' && policy.scannerQuality === scannerQuality
		);
		const greedy = input.policies.find(
			(policy) => policy.name === 'greedy' && policy.scannerQuality === scannerQuality
		);
		const oracle = input.policies.find(
			(policy) => policy.name === 'oracle' && policy.scannerQuality === scannerQuality
		);

		if (!planner || !randomPolicy || !matcher || !greedy || !oracle) {
			gateFailures.push(`missing policy bands for scanner ${scannerQuality}`);
			continue;
		}

		const randomEdge = planner.medianScore - randomPolicy.medianScore;
		if (randomEdge < minPlannerRandomEdge) {
			gateFailures.push(
				`q${input.queueLength} ${scannerQuality} planner median score edge vs random ${randomEdge.toFixed(1)} is below ${minPlannerRandomEdge}`
			);
		}

		const matcherEdge = planner.medianScore - matcher.medianScore;
		if (matcherEdge <= 0) {
			gateFailures.push(
				`q${input.queueLength} ${scannerQuality} planner median score ${planner.medianScore.toFixed(1)} did not beat event_matcher ${matcher.medianScore.toFixed(1)}`
			);
		}

		if (greedy.medianScore > planner.medianScore) {
			gateFailures.push(
				`q${input.queueLength} ${scannerQuality} greedy median score ${greedy.medianScore.toFixed(1)} beat planner ${planner.medianScore.toFixed(1)}`
			);
		}

		if (oracle.medianScore < planner.medianScore) {
			gateFailures.push(
				`q${input.queueLength} ${scannerQuality} oracle median score ${oracle.medianScore.toFixed(1)} fell below planner ${planner.medianScore.toFixed(1)}`
			);
		}

		if (planner.topCommandSharePct > maxTopCommandSharePct) {
			gateFailures.push(
				`q${input.queueLength} ${scannerQuality} planner top command concentration ${planner.topCommandSharePct.toFixed(1)}% exceeds ${maxTopCommandSharePct}%`
			);
		}
	}

	const poorPlanner = input.policies.find(
		(policy) => policy.name === 'planner' && policy.scannerQuality === 'poor'
	);
	const basicPlanner = input.policies.find(
		(policy) => policy.name === 'planner' && policy.scannerQuality === 'basic'
	);
	const goodPlanner = input.policies.find(
		(policy) => policy.name === 'planner' && policy.scannerQuality === 'good'
	);
	if (
		poorPlanner &&
		basicPlanner &&
		goodPlanner &&
		!(
			poorPlanner.medianUnknownForecastPct >
			basicPlanner.medianUnknownForecastPct &&
			basicPlanner.medianUnknownForecastPct > goodPlanner.medianUnknownForecastPct
		)
	) {
		gateFailures.push(`q${input.queueLength} planner unknown-forecast gradient is not monotonic`);
	}

	return gateFailures;
}

export function buildCommandQueuePolicyReport(input: {
	queueLength?: CommandQueueSlotLength;
	sampleSize: number;
	baseSeed: number;
	policies?: CommandQueuePolicyName[];
	scannerQualities?: ScannerForecastQuality[];
}): CommandQueuePolicyReport {
	const queueLength = input.queueLength ?? MEDIUM_COMMAND_QUEUE_SLOT_LENGTH;
	const policies = input.policies ?? COMMAND_QUEUE_POLICY_NAMES;
	const scannerQualities = input.scannerQualities ?? SCANNER_QUALITIES;
	const runSeeds = runSeedsForPolicySim(input.sampleSize, input.baseSeed);

	const bands: CommandQueuePolicyBand[] = [];
	for (const scannerQuality of scannerQualities) {
		for (const policy of policies) {
			const runs = runSeeds.map((runSeed) =>
				simulateCommandQueuePolicyRun({
					runSeed,
					queueLength,
					scannerQuality,
					policy
				})
			);
			const scores = runs.map((run) => run.score).sort((left, right) => left - right);

			bands.push({
				name: policy,
				scannerQuality,
				queueLength,
				p10Score: percentile(scores, 0.1),
				medianScore: percentile(scores, 0.5),
				p90Score: percentile(scores, 0.9),
				medianRecovered: medianOf(runs.map((run) => run.recovered)),
				medianWaste: medianOf(runs.map((run) => run.waste)),
				medianHull: medianOf(runs.map((run) => run.hull)),
				medianSurges: medianOf(runs.map((run) => run.surges)),
				medianRepairDebt: medianOf(runs.map((run) => run.repairDebt)),
				medianBeatLossEquivalent: medianOf(runs.map((run) => run.beatLossEquivalent)),
				medianHullDebt: medianOf(runs.map((run) => run.hullDebt)),
				topCommandSharePct: topCommandSharePct(runs),
				medianUnknownForecastPct: medianOf(
					runs.map((run) => run.unknownForecastRatio * 100)
				),
				sampleSize: runs.length
			});
		}
	}

	const gateFailures = evaluatePolicyGates({ queueLength, policies: bands });
	return {
		queueLength,
		policies: bands,
		hullDamageGuidance: buildHullDamageGuidance({ queueLength, policies: bands }),
		gateFailures
	};
}

export function assertCommandQueuePolicyGate(input: {
	queueLength?: CommandQueueSlotLength;
	sampleSize: number;
	baseSeed: number;
}): CommandQueuePolicyReport {
	const report = buildCommandQueuePolicyReport(input);
	if (report.gateFailures.length > 0) {
		throw new Error(`Command queue policy gates failed:\n- ${report.gateFailures.join('\n- ')}`);
	}
	return report;
}
