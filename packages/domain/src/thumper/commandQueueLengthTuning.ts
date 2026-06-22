import {
	FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
	starterScriptForQueueLength
} from './starterCommandQueueScript.js';
import {
	COMMAND_QUEUE_SLOT_LENGTHS,
	type CommandQueueSlotLength,
	requiredCommandQueueScriptLength
} from './commandQueueSlotLength.js';
import {
	STARTING_HEAT,
	STARTING_HULL,
	RUN_BEATS,
	forecastCommandQueueEvents,
	generateCommandQueueEvents,
	replayCommandQueueRun,
	resolveCommandQueueRunResult,
	type CommandQueueRunState,
	type ScannerForecastQuality,
	type ThumperCommand
} from './thumperCommandQueueRun.js';

export type CommandQueueYieldBand = {
	queueLength: CommandQueueSlotLength;
	p10: number;
	median: number;
	p90: number;
	min: number;
	max: number;
	sampleSize: number;
};

export type CommandQueueLengthTuningReport = {
	yieldBands: CommandQueueYieldBand[];
	forecastUnknownPct: Record<
		ScannerForecastQuality,
		Record<CommandQueueSlotLength, number>
	>;
	gateFailures: string[];
	readyForMediumQueueUi: boolean;
	readyForLargeQueueUi: boolean;
};

export type CommandQueueRoteStrategyName =
	| 'starter'
	| 'all_drill'
	| 'drill_drill_bank'
	| 'drill_drill_vent'
	| 'brace_cadence'
	| 'random_baseline';

export type CommandQueueRoteStrategyBand = {
	name: CommandQueueRoteStrategyName;
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
	sampleSize: number;
};

export type CommandQueueRoteStrategyReport = {
	queueLength: CommandQueueSlotLength;
	strategies: CommandQueueRoteStrategyBand[];
	gateFailures: string[];
};

const SCANNER_QUALITIES: ScannerForecastQuality[] = ['poor', 'basic', 'good'];

function percentile(sorted: number[], ratio: number): number {
	if (sorted.length === 0) {
		return 0;
	}
	const index = Math.min(sorted.length - 1, Math.max(0, Math.floor((sorted.length - 1) * ratio)));
	return sorted[index]!;
}

export function buildYieldBand(
	queueLength: CommandQueueSlotLength,
	recoveredQuantities: number[]
): CommandQueueYieldBand {
	const sorted = [...recoveredQuantities].sort((left, right) => left - right);
	return {
		queueLength,
		p10: percentile(sorted, 0.1),
		median: percentile(sorted, 0.5),
		p90: percentile(sorted, 0.9),
		min: sorted[0] ?? 0,
		max: sorted[sorted.length - 1] ?? 0,
		sampleSize: sorted.length
	};
}

function medianOf(values: number[]): number {
	return percentile(
		[...values].sort((left, right) => left - right),
		0.5
	);
}

export function commandQueueBeatLossEquivalent(state: CommandQueueRunState): number {
	const hullDamage = Math.max(0, STARTING_HULL - state.hull);
	return Math.floor(hullDamage / 4);
}

export function commandQueueRepairDebt(state: CommandQueueRunState): number {
	const hullDebt = Math.max(0, STARTING_HULL - state.hull) * 0.65;
	const heatDebt = Math.max(0, state.heat - STARTING_HEAT) * 0.25;
	const surgeDebt = state.surgeCount * 2.5;
	const lossDebt = state.lost * 0.2;
	const beatLossDebt = commandQueueBeatLossEquivalent(state) * 1.5;
	return hullDebt + heatDebt + surgeDebt + lossDebt + beatLossDebt;
}

export function scoreCommandQueueRunState(state: CommandQueueRunState): number {
	return state.secured - commandQueueRepairDebt(state);
}

export function measureForecastUnknownPct(input: {
	runSeed: string;
	queueLength: CommandQueueSlotLength;
	scannerQuality: ScannerForecastQuality;
}): number {
	const events = generateCommandQueueEvents(input.runSeed);
	let unknown = 0;
	let total = 0;

	for (let beat = 0; beat < RUN_BEATS; beat += 1) {
		const tokens = forecastCommandQueueEvents({
			runSeed: input.runSeed,
			events,
			beat,
			queueLength: input.queueLength,
			scannerQuality: input.scannerQuality
		});

		for (const token of tokens) {
			total += 1;
			if (token.kind === null) {
				unknown += 1;
			}
		}
	}

	return total === 0 ? 0 : (unknown / total) * 100;
}

export function simulateStarterScriptRecovery(input: {
	runSeed: string;
	queueLength: CommandQueueSlotLength;
}): number {
	const state = replayCommandQueueRun({
		runSeed: input.runSeed,
		commands: starterScriptForQueueLength(input.queueLength),
		queueLength: input.queueLength
	});

	return resolveCommandQueueRunResult(state).recoveredQuantity;
}

function runSeedsForTuning(sampleSize: number, baseSeed: number): string[] {
	return Array.from({ length: sampleSize }, (_, index) => `command-queue-tuning:${baseSeed + index}`);
}

const THUMPER_COMMAND_SCRIPT_COMMANDS: ThumperCommand[] = ['drill', 'bank', 'brace', 'vent'];

function repeatPattern(pattern: ThumperCommand[], length: number): ThumperCommand[] {
	return Array.from({ length }, (_, index) => pattern[index % pattern.length]!);
}

function hashString(value: string): number {
	let hash = 2166136261;
	for (let index = 0; index < value.length; index += 1) {
		hash ^= value.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function deterministicRandomScript(input: {
	runSeed: string;
	queueLength: CommandQueueSlotLength;
	length: number;
}): ThumperCommand[] {
	const seedHash = hashString(`${input.runSeed}:${input.queueLength}`);
	return Array.from({ length: input.length }, (_, index) => {
		const value = (seedHash + Math.imul(index + 1, 1664525) + 1013904223) >>> 0;
		return THUMPER_COMMAND_SCRIPT_COMMANDS[value % THUMPER_COMMAND_SCRIPT_COMMANDS.length]!;
	});
}

export function scriptForRoteStrategy(input: {
	name: CommandQueueRoteStrategyName;
	queueLength: CommandQueueSlotLength;
	runSeed: string;
}): ThumperCommand[] {
	const length = requiredCommandQueueScriptLength(input.queueLength);
	if (input.name === 'starter') {
		return starterScriptForQueueLength(input.queueLength);
	}
	if (input.name === 'all_drill') {
		return repeatPattern(['drill'], length);
	}
	if (input.name === 'drill_drill_bank') {
		return repeatPattern(['drill', 'drill', 'bank'], length);
	}
	if (input.name === 'drill_drill_vent') {
		return repeatPattern(['drill', 'drill', 'vent'], length);
	}
	if (input.name === 'brace_cadence') {
		return repeatPattern(['drill', 'brace', 'drill', 'bank', 'vent', 'brace'], length);
	}
	return deterministicRandomScript({
		runSeed: input.runSeed,
		queueLength: input.queueLength,
		length
	});
}

function simulateRoteStrategy(input: {
	name: CommandQueueRoteStrategyName;
	queueLength: CommandQueueSlotLength;
	runSeed: string;
}) {
	const state = replayCommandQueueRun({
		runSeed: input.runSeed,
		commands: scriptForRoteStrategy(input),
		queueLength: input.queueLength
	});
	const result = resolveCommandQueueRunResult(state);
	const repairDebt = commandQueueRepairDebt(state);
	return {
		score: result.recoveredQuantity - repairDebt,
		recovered: result.recoveredQuantity,
		waste: result.wasteQuantity,
		hull: result.hullRemaining,
		surges: result.surgeCount,
		repairDebt,
		beatLossEquivalent: commandQueueBeatLossEquivalent(state)
	};
}

const ROTE_STRATEGIES: CommandQueueRoteStrategyName[] = [
	'starter',
	'all_drill',
	'drill_drill_bank',
	'drill_drill_vent',
	'brace_cadence',
	'random_baseline'
];
const DRILL_HEAVY_GATE_STRATEGIES: CommandQueueRoteStrategyName[] = [
	'all_drill',
	'drill_drill_bank',
	'drill_drill_vent'
];

export function buildRoteStrategyReport(input: {
	queueLength: CommandQueueSlotLength;
	sampleSize: number;
	baseSeed: number;
}): CommandQueueRoteStrategyReport {
	const runSeeds = runSeedsForTuning(input.sampleSize, input.baseSeed);
	const strategies = ROTE_STRATEGIES.map((name) => {
		const runs = runSeeds.map((runSeed) =>
			simulateRoteStrategy({
				name,
				queueLength: input.queueLength,
				runSeed
			})
		);
		const scores = runs.map((run) => run.score).sort((left, right) => left - right);

		return {
			name,
			queueLength: input.queueLength,
			p10Score: percentile(scores, 0.1),
			medianScore: percentile(scores, 0.5),
			p90Score: percentile(scores, 0.9),
			medianRecovered: medianOf(runs.map((run) => run.recovered)),
			medianWaste: medianOf(runs.map((run) => run.waste)),
			medianHull: medianOf(runs.map((run) => run.hull)),
			medianSurges: medianOf(runs.map((run) => run.surges)),
			medianRepairDebt: medianOf(runs.map((run) => run.repairDebt)),
			medianBeatLossEquivalent: medianOf(runs.map((run) => run.beatLossEquivalent)),
			sampleSize: runs.length
		};
	});

	const starter = strategies.find((strategy) => strategy.name === 'starter')!;
	const gateFailures: string[] = [];
	for (const challenger of strategies) {
		if (!DRILL_HEAVY_GATE_STRATEGIES.includes(challenger.name)) {
			continue;
		}
		if (starter.medianScore <= challenger.medianScore) {
			gateFailures.push(
				`starter median score ${starter.medianScore.toFixed(1)} did not beat ${challenger.name} median score ${challenger.medianScore.toFixed(1)}`
			);
		}
	}

	return {
		queueLength: input.queueLength,
		strategies,
		gateFailures
	};
}

export function assertRoteStrategyGate(input: {
	queueLength: CommandQueueSlotLength;
	sampleSize: number;
	baseSeed: number;
}): CommandQueueRoteStrategyReport {
	const report = buildRoteStrategyReport(input);
	if (report.gateFailures.length > 0) {
		throw new Error(`Command queue rote strategy gates failed:\n- ${report.gateFailures.join('\n- ')}`);
	}
	return report;
}

export function buildCommandQueueLengthTuningReport(input?: {
	sampleSize?: number;
	baseSeed?: number;
	probeSeed?: string;
}): CommandQueueLengthTuningReport {
	const sampleSize = input?.sampleSize ?? 120;
	const baseSeed = input?.baseSeed ?? 20260621;
	const probeSeed = input?.probeSeed ?? FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED;
	const runSeeds = runSeedsForTuning(sampleSize, baseSeed);

	const yieldBands = COMMAND_QUEUE_SLOT_LENGTHS.map((queueLength) =>
		buildYieldBand(
			queueLength,
			runSeeds.map((runSeed) =>
				simulateStarterScriptRecovery({
					runSeed,
					queueLength
				})
			)
		)
	);

	const forecastUnknownPct = {
		poor: { 2: 0, 3: 0, 4: 0 },
		basic: { 2: 0, 3: 0, 4: 0 },
		good: { 2: 0, 3: 0, 4: 0 }
	} as Record<ScannerForecastQuality, Record<CommandQueueSlotLength, number>>;

	for (const scannerQuality of SCANNER_QUALITIES) {
		for (const queueLength of COMMAND_QUEUE_SLOT_LENGTHS) {
			forecastUnknownPct[scannerQuality][queueLength] = measureForecastUnknownPct({
				runSeed: probeSeed,
				queueLength,
				scannerQuality
			});
		}
	}

	const gateFailures: string[] = [];
	const bandByLength = Object.fromEntries(
		yieldBands.map((band) => [band.queueLength, band])
	) as Record<CommandQueueSlotLength, CommandQueueYieldBand>;

	for (const queueLength of COMMAND_QUEUE_SLOT_LENGTHS) {
		const band = bandByLength[queueLength];
		if (band.median <= 0 || band.p10 <= 0) {
			gateFailures.push(`queue ${queueLength} starter-script median/p10 recovery is zero`);
		}
	}

	const q2Median = bandByLength[2].median;
	if (bandByLength[3].median < q2Median * 0.55) {
		gateFailures.push('queue 3 median recovery fell more than 45% below queue 2');
	}
	if (bandByLength[4].median < q2Median * 0.45) {
		gateFailures.push('queue 4 median recovery fell more than 55% below queue 2');
	}

	for (const queueLength of COMMAND_QUEUE_SLOT_LENGTHS) {
		const poor = forecastUnknownPct.poor[queueLength];
		const basic = forecastUnknownPct.basic[queueLength];
		const good = forecastUnknownPct.good[queueLength];
		if (!(poor > basic && basic > good)) {
			gateFailures.push(`queue ${queueLength} scanner unknown-rate gradient is not monotonic`);
		}
	}

	const basicQ2 = forecastUnknownPct.basic[2];
	const basicQ3 = forecastUnknownPct.basic[3];
	const basicQ4 = forecastUnknownPct.basic[4];
	if (!(basicQ2 < basicQ3)) {
		gateFailures.push('basic scanner unknown rate does not rise from queue 2 to queue 3');
	}
	if (!(basicQ3 < basicQ4)) {
		gateFailures.push('basic scanner unknown rate does not rise from queue 3 to queue 4');
	}

	for (const queueLength of COMMAND_QUEUE_SLOT_LENGTHS) {
		const required = requiredCommandQueueScriptLength(queueLength);
		const script = starterScriptForQueueLength(queueLength);
		if (script.length !== required) {
			gateFailures.push(`queue ${queueLength} starter script length drifted from ${required}`);
		}
	}

	const mediumGateFailures = gateFailures.filter(
		(failure) =>
			failure.includes('queue 2') ||
			failure.includes('queue 3') ||
			failure.includes('from queue 2 to queue 3')
	);

	return {
		yieldBands,
		forecastUnknownPct,
		gateFailures,
		readyForMediumQueueUi: mediumGateFailures.length === 0,
		readyForLargeQueueUi: gateFailures.length === 0
	};
}

export function assertMediumLargeQueueGate(input?: {
	sampleSize?: number;
	baseSeed?: number;
}): CommandQueueLengthTuningReport {
	const report = buildCommandQueueLengthTuningReport(input);
	if (report.gateFailures.length > 0) {
		throw new Error(`Command queue length gates failed:\n- ${report.gateFailures.join('\n- ')}`);
	}
	return report;
}
