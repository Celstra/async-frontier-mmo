import { describe, expect, it } from 'vitest';
import {
	STARTER_QUEUE_LENGTH,
	RUN_BEATS,
	createCommandQueueRunState,
	generateCommandQueueEvents,
	forecastCommandQueueEvents,
	queueCommand,
	canResolveNextBeat,
	resolveNextBeat,
	replayCommandQueueRun,
	replayCommandQueueRunToProgress,
	nextCommandQueueFillBeatIndex,
	resolveCommandQueueRunResult,
	recallCommandQueueRun,
	finishCommandQueueRun,
	buildCommandQueueBeatReadout,
	HEAT_LIMIT,
	type ThumperCommand
} from './thumperCommandQueueRun.js';

function fillInitialQueue(
	state: ReturnType<typeof createCommandQueueRunState>,
	commands: ThumperCommand[]
) {
	for (const command of commands) {
		expect(queueCommand(state, command)).toEqual({ ok: true });
	}
}

function resolveBeat(
	state: ReturnType<typeof createCommandQueueRunState>,
	eventDeck: ReturnType<typeof generateCommandQueueEvents>
) {
	expect(canResolveNextBeat(state)).toBe(true);
	return resolveNextBeat(state, eventDeck[state.currentBeat]!);
}

describe('thumperCommandQueueRun', () => {
	it('same seed and queued commands produce the same result', () => {
		const commands: ThumperCommand[] = [
			'drill',
			'bank',
			'vent',
			'drill',
			'bank',
			'brace',
			'drill',
			'vent',
			'bank',
			'drill',
			'brace',
			'vent',
			'drill',
			'bank',
			'drill',
			'vent',
			'bank',
			'drill',
			'brace'
		];
		const first = replayCommandQueueRun({ runSeed: 'deterministic-seed', commands });
		const second = replayCommandQueueRun({ runSeed: 'deterministic-seed', commands });
		expect(first.secured).toBe(second.secured);
		expect(first.loose).toBe(second.loose);
		expect(first.hull).toBe(second.hull);
		expect(first.heat).toBe(second.heat);
		expect(first.lost).toBe(second.lost);
		expect(first.surgeCount).toBe(second.surgeCount);
	});

	it('different seeds produce different event texture', () => {
		const commands = Array.from({ length: 19 }, () => 'drill' as const);
		const first = replayCommandQueueRun({ runSeed: 'seed-a', commands });
		const second = replayCommandQueueRun({ runSeed: 'seed-b', commands });
		const firstEvents = generateCommandQueueEvents('seed-a');
		const secondEvents = generateCommandQueueEvents('seed-b');
		expect(firstEvents).not.toEqual(secondEvents);
		expect(first.hull + first.lost + first.surgeCount).not.toBe(
			second.hull + second.lost + second.surgeCount
		);
	});

	it('starter run uses a 2-slot queue', () => {
		const state = createCommandQueueRunState();
		expect(state.queueLength).toBe(STARTER_QUEUE_LENGTH);
		expect(state.queueLength).toBe(2);
	});

	it('first beat cannot resolve until initial queue is full', () => {
		const state = createCommandQueueRunState();
		expect(canResolveNextBeat(state)).toBe(false);

		expect(queueCommand(state, 'drill')).toEqual({ ok: true });
		expect(canResolveNextBeat(state)).toBe(false);

		expect(queueCommand(state, 'bank')).toEqual({ ok: true });
		expect(canResolveNextBeat(state)).toBe(true);
	});

	it('later beat cannot resolve until the new back slot is filled', () => {
		const state = createCommandQueueRunState();
		const events = generateCommandQueueEvents('back-slot-seed');
		fillInitialQueue(state, ['drill', 'bank']);

		resolveBeat(state, events);
		expect(canResolveNextBeat(state)).toBe(false);

		expect(queueCommand(state, 'vent')).toEqual({ ok: true });
		expect(canResolveNextBeat(state)).toBe(true);
	});

	it('player can only fill the newest back slot', () => {
		const state = createCommandQueueRunState();
		expect(queueCommand(state, 'drill')).toEqual({ ok: true });
		expect(queueCommand(state, 'bank')).toEqual({ ok: true });
		expect(queueCommand(state, 'vent')).toEqual({
			ok: false,
			reason: 'Command queue is full'
		});
	});

	it('command resolves before field event', () => {
		const state = createCommandQueueRunState();
		const events = [{ kind: 'cargo' as const, amount: 3 }];
		fillInitialQueue(state, ['bank', 'drill']);

		resolveNextBeat(state, events[0]!);

		expect(state.secured).toBe(0);
		expect(state.loose).toBe(3);
	});

	it('bank before cargo +3 does not secure incoming cargo', () => {
		const state = createCommandQueueRunState();
		fillInitialQueue(state, ['bank', 'drill']);

		resolveNextBeat(state, { kind: 'cargo', amount: 3 });

		expect(state.secured).toBe(0);
		expect(state.loose).toBe(3);
	});

	it('brace blocks hull and raid events and consumes guard charges', () => {
		const state = createCommandQueueRunState();
		fillInitialQueue(state, ['brace', 'drill']);

		resolveNextBeat(state, { kind: 'hull', amount: 3 });
		expect(state.hull).toBe(55);
		expect(state.guard).toBe(1);

		expect(queueCommand(state, 'drill')).toEqual({ ok: true });
		resolveNextBeat(state, { kind: 'raid', amount: 3 });
		expect(state.hull).toBe(55);
		expect(state.loose).toBe(3);
		expect(state.guard).toBe(0);
	});

	it('vent lowers heat and costs loose cargo when loose cargo exists', () => {
		const state = createCommandQueueRunState({
			startingHeat: 6,
			startingLoose: 4
		});
		fillInitialQueue(state, ['vent', 'drill']);

		resolveNextBeat(state, { kind: 'cargo', amount: 2 });

		expect(state.heat).toBe(3);
		expect(state.loose).toBe(5);
		expect(state.lost).toBe(1);
	});

	it('heat surge applies hull and loose-cargo loss, then resets heat', () => {
		const state = createCommandQueueRunState({
			startingHeat: 8,
			startingLoose: 4
		});
		fillInitialQueue(state, ['drill', 'drill']);

		resolveNextBeat(state, { kind: 'heat', amount: 3 });

		expect(state.surgeCount).toBe(1);
		expect(state.heat).toBe(5);
		expect(state.hull).toBe(53);
		expect(state.loose).toBe(5);
		expect(state.lost).toBe(2);
	});

	it('recall ends immediately and is not queued', () => {
		const state = createCommandQueueRunState({ startingLoose: 5 });
		fillInitialQueue(state, ['bank', 'drill']);

		expect(recallCommandQueueRun(state)).toEqual({ ok: true });
		expect(state.recalled).toBe(true);
		expect(state.ended).toBe(true);
		expect(state.loose).toBe(0);
		expect(queueCommand(state, 'vent')).toEqual({
			ok: false,
			reason: 'Run has ended'
		});
	});

	it('recall forfeits loose cargo into waste accounting', () => {
		const state = createCommandQueueRunState({ startingLoose: 5 });
		recallCommandQueueRun(state);

		const result = resolveCommandQueueRunResult(state);
		expect(result.forfeitedLoose).toBe(5);
		expect(result.wasteQuantity).toBe(5);
		expect(result.recoveredQuantity).toBe(0);
	});

	it('forecast reveal varies per beat instead of repeating by offset', () => {
		const events = generateCommandQueueEvents('multi-beat-forecast');
		const beatZeroA = forecastCommandQueueEvents({
			runSeed: 'multi-beat-forecast',
			events,
			beat: 0,
			queueLength: 2,
			scannerQuality: 'poor'
		});
		const beatZeroB = forecastCommandQueueEvents({
			runSeed: 'multi-beat-forecast',
			events,
			beat: 0,
			queueLength: 2,
			scannerQuality: 'poor'
		});
		expect(beatZeroA).toEqual(beatZeroB);

		const offsetZeroByBeat = [0, 1, 2, 3, 4, 5].map((beat) =>
			forecastCommandQueueEvents({
				runSeed: 'multi-beat-forecast',
				events,
				beat,
				queueLength: 2,
				scannerQuality: 'poor'
			})[0]
		);
		const uniqueOffsetZero = new Set(offsetZeroByBeat.map((token) => JSON.stringify(token)));
		expect(uniqueOffsetZero.size).toBeGreaterThan(1);
	});

	it('scanner quality changes forecast reveal, not the true event deck or yield', () => {
		const events = generateCommandQueueEvents('scanner-seed');
		const commands = Array.from({ length: 19 }, () => 'drill' as const);

		const poor = forecastCommandQueueEvents({
			runSeed: 'scanner-seed',
			events,
			beat: 0,
			queueLength: 2,
			scannerQuality: 'poor'
		});
		const good = forecastCommandQueueEvents({
			runSeed: 'scanner-seed',
			events,
			beat: 0,
			queueLength: 2,
			scannerQuality: 'good'
		});

		const poorUnknown = poor.filter((token) => token.kind === null).length;
		const goodUnknown = good.filter((token) => token.kind === null).length;
		expect(goodUnknown).toBeLessThan(poorUnknown);

		const poorRun = replayCommandQueueRun({
			runSeed: 'scanner-seed',
			commands
		});
		const goodRun = replayCommandQueueRun({
			runSeed: 'scanner-seed',
			commands
		});
		expect(poorRun.secured).toBe(goodRun.secured);
		expect(poorRun.lost).toBe(goodRun.lost);
	});

	it('3/4-slot queue configs can exist in the domain, but starter config remains 2', () => {
		const threeSlot = createCommandQueueRunState({ queueLength: 3 });
		const fourSlot = createCommandQueueRunState({ queueLength: 4 });
		const starter = createCommandQueueRunState();

		expect(threeSlot.queueLength).toBe(3);
		expect(fourSlot.queueLength).toBe(4);
		expect(starter.queueLength).toBe(2);
	});

	it('replays the full starter beat count', () => {
		const commands = Array.from({ length: 19 }, () => 'drill' as const);
		const state = replayCommandQueueRun({ runSeed: 'full-run', commands });
		expect(state.currentBeat).toBe(RUN_BEATS);
		expect(state.ended).toBe(true);
	});

	it('resolveCommandQueueRunResult is pure and requires an ended run', () => {
		const state = createCommandQueueRunState();
		fillInitialQueue(state, ['drill', 'drill']);
		resolveNextBeat(state, { kind: 'cargo', amount: 0 });
		state.loose = 10;

		expect(() => resolveCommandQueueRunResult(state)).toThrow(
			'Command queue run has not ended'
		);

		finishCommandQueueRun(state);
		const result = resolveCommandQueueRunResult(state);
		expect(result.recoveredQuantity).toBe(4);
		expect(state.loose).toBe(0);
	});

	it('replays stored progress through resolved beats and refills the visible queue', () => {
		const runSeed = 'progress-replay-seed';
		const commands: ThumperCommand[] = [
			'drill',
			'bank',
			'vent',
			'drill',
			'bank',
			'brace',
			'drill',
			'vent',
			'bank',
			'drill',
			'brace',
			'vent',
			'drill',
			'bank',
			'drill',
			'vent',
			'bank',
			'drill',
			'brace'
		];
		const commandsByBeatIndex = commands.map((command, beatIndex) => ({
			beatIndex,
			command
		}));

		const partial = replayCommandQueueRunToProgress({
			runSeed,
			commandsByBeatIndex,
			resolvedBeatCount: 2
		});
		const baseline = createCommandQueueRunState();
		fillInitialQueue(baseline, commands.slice(0, 2));
		const events = generateCommandQueueEvents(runSeed);
		resolveBeat(baseline, events);
		expect(queueCommand(baseline, commands[2]!)).toEqual({ ok: true });
		resolveBeat(baseline, events);

		expect(partial.currentBeat).toBe(2);
		expect(partial.queue).toEqual(['vent', 'drill']);
		expect(partial.secured).toBe(baseline.secured);
		expect(partial.loose).toBe(baseline.loose);
		expect(partial.heat).toBe(baseline.heat);
		expect(partial.hull).toBe(baseline.hull);
	});

	it('nextCommandQueueFillBeatIndex tracks the newest back slot', () => {
		const state = createCommandQueueRunState();
		expect(nextCommandQueueFillBeatIndex(state)).toBe(0);

		queueCommand(state, 'drill');
		expect(nextCommandQueueFillBeatIndex(state)).toBe(1);

		queueCommand(state, 'bank');
		expect(nextCommandQueueFillBeatIndex(state)).toBeNull();
	});

	it('buildCommandQueueBeatReadout uses compact command, field, and heat lines', () => {
		expect(
			buildCommandQueueBeatReadout({
				command: 'drill',
				event: { kind: 'cargo', amount: 2 },
				heat: 5
			})
		).toEqual({
			commandLine: 'DRILL +3 loose',
			fieldLine: 'FIELD CARGO +2',
			heatLine: `Heat 5/${HEAT_LIMIT}`
		});

		expect(
			buildCommandQueueBeatReadout({
				command: 'brace',
				event: { kind: 'hull', amount: 2 },
				heat: 4
			})
		).toEqual({
			commandLine: 'BRACE guard 2',
			fieldLine: 'FIELD HULL -2',
			heatLine: `Heat 4/${HEAT_LIMIT}`
		});
	});
});
