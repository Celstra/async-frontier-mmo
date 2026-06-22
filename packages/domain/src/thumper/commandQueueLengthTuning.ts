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
	RUN_BEATS,
	forecastCommandQueueEvents,
	generateCommandQueueEvents,
	replayCommandQueueRun,
	resolveCommandQueueRunResult,
	type ScannerForecastQuality
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
