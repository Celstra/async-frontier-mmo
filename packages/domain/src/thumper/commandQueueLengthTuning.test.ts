import { describe, expect, it } from 'vitest';
import {
	assertMediumLargeQueueGate,
	buildCommandQueueLengthTuningReport,
	buildYieldBand,
	measureForecastUnknownPct,
	simulateStarterScriptRecovery
} from './commandQueueLengthTuning.js';
import {
	COMMAND_QUEUE_SLOT_LENGTHS,
	requiredCommandQueueScriptLength
} from './commandQueueSlotLength.js';
import {
	assertStarterScriptLength,
	FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
	starterScriptForQueueLength
} from './starterCommandQueueScript.js';
import { RUN_BEATS } from './thumperCommandQueueRun.js';

describe('commandQueueLengthTuning', () => {
	it('starter scripts match required command counts for queue lengths 2/3/4', () => {
		for (const queueLength of COMMAND_QUEUE_SLOT_LENGTHS) {
			assertStarterScriptLength(queueLength);
			expect(starterScriptForQueueLength(queueLength)).toHaveLength(
				requiredCommandQueueScriptLength(queueLength)
			);
		}

		expect(requiredCommandQueueScriptLength(2)).toBe(RUN_BEATS);
		expect(requiredCommandQueueScriptLength(3)).toBe(RUN_BEATS);
		expect(requiredCommandQueueScriptLength(4)).toBe(RUN_BEATS);
	});

	it('starter-script recovery stays above zero for all queue lengths', () => {
		for (const queueLength of COMMAND_QUEUE_SLOT_LENGTHS) {
			const recovered = simulateStarterScriptRecovery({
				runSeed: FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
				queueLength
			});
			expect(recovered).toBeGreaterThan(0);
		}
	});

	it('scanner unknown rate rises with queue length at basic quality', () => {
		const q2 = measureForecastUnknownPct({
			runSeed: FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
			queueLength: 2,
			scannerQuality: 'basic'
		});
		const q3 = measureForecastUnknownPct({
			runSeed: FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
			queueLength: 3,
			scannerQuality: 'basic'
		});
		const q4 = measureForecastUnknownPct({
			runSeed: FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
			queueLength: 4,
			scannerQuality: 'basic'
		});

		expect(q2).toBeLessThan(q3);
		expect(q3).toBeLessThan(q4);
	});

	it('medium/large queue gates pass on the starter-script tuning harness', () => {
		const report = assertMediumLargeQueueGate({ sampleSize: 96, baseSeed: 20260621 });
		expect(report.readyForMediumQueueUi).toBe(true);
		expect(report.yieldBands.map((band) => band.queueLength)).toEqual([2, 3, 4]);
		expect(report.yieldBands.every((band) => band.median > 0)).toBe(true);
	});

	it('buildYieldBand reports percentile bands', () => {
		const band = buildYieldBand(2, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
		expect(band.min).toBe(1);
		expect(band.max).toBe(10);
		expect(band.median).toBe(5);
		expect(band.sampleSize).toBe(10);
	});

	it('reports gate failures without throwing when tuning regresses', () => {
		const report = buildCommandQueueLengthTuningReport({ sampleSize: 24, baseSeed: 99 });
		expect(report.yieldBands).toHaveLength(3);
		expect(report.forecastUnknownPct.basic[2]).toBeGreaterThanOrEqual(0);
	});
});
