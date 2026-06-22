import { describe, expect, it } from 'vitest';
import { OLD_RUNDOWN_SMALL_PERSONAL_THUMPER } from './smallPersonalThumperPreset.js';
import type { ThumperPartSnapshot } from './thumperPartTypes.js';
import {
	DEFENSE_RUN_DURATION_SECONDS,
	DEFENSE_RUN_TICKS,
	DEFENSE_TICK_SECONDS,
	applyDefenseAction,
	buildDefenseRunConfig,
	buildDefenseRunView,
	createDefenseRunState,
	getAvailableDefenseActions,
	replayDefenseRun,
	resolveDefenseRunResult,
	type DefenseActionLogEntry
} from './thumperDefenseRun.js';

function starterSnapshots(): ThumperPartSnapshot[] {
	return OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.starterParts.map((part) => ({
		slot: part.slot,
		itemId: `item-${part.slot}`,
		schematicId: part.schematicId,
		displayName: part.displayName,
		propertyScores: { ...part.propertyScores },
		condition: part.condition,
		integrity: part.integrity
	}));
}

function replayWithActions(seed: string, actions: DefenseActionLogEntry[]) {
	const deployedAt = new Date('2026-06-20T12:00:00.000Z');
	const now = new Date(deployedAt.getTime() + DEFENSE_RUN_TICKS * DEFENSE_TICK_SECONDS * 1_000);
	return replayDefenseRun({
		runSeed: seed,
		concentrationPercent: 67,
		parts: starterSnapshots(),
		actions,
		deployedAt,
		now
	});
}

describe('thumperDefenseRun', () => {
	it('paces the starter defense as readable ten-second decision steps', () => {
		expect(DEFENSE_TICK_SECONDS).toBe(10);
		expect(DEFENSE_RUN_DURATION_SECONDS).toBe(180);
	});

	it('same seed and actions produce the same secured units', () => {
		const actions: DefenseActionLogEntry[] = [
			{ tick: 0, kind: 'brace_hull' },
			{ tick: 1, kind: 'vent_pump' },
			{ tick: 2, kind: 'secure_cargo' }
		];
		const first = replayWithActions('deterministic-seed', actions);
		const second = replayWithActions('deterministic-seed', actions);
		expect(first.secured).toBe(second.secured);
		expect(first.cargoLost).toBe(second.cargoLost);
	});

	it('different seeds produce different threat pressure', () => {
		const first = replayWithActions('seed-a', []);
		const second = replayWithActions('seed-b', []);
		expect(first.threats.length + first.cargoLost + first.secured).not.toBe(
			second.threats.length + second.cargoLost + second.secured
		);
	});

	it('starter defense produces visible material progress even with passive play', () => {
		const state = replayWithActions('passive-progress-seed', []);
		const result = resolveDefenseRunResult(state);
		expect(state.failed).toBe(false);
		expect(result.recoveredQuantity).toBeGreaterThan(0);
	});

	it('defense view recommends the first useful cargo-making action and shows the next step timer', () => {
		const config = buildDefenseRunConfig({
			parts: starterSnapshots(),
			concentrationPercent: 67
		});
		const state = createDefenseRunState({ config });
		const deployedAt = new Date('2026-06-20T12:00:00.000Z');
		const view = buildDefenseRunView({
			state,
			projectNeedUnits: 60,
			deployedAt,
			now: deployedAt
		});

		expect(view.secondsPerTick).toBe(10);
		expect(view.nextTickInSeconds).toBe(10);
		expect(view.recommendedAction?.kind).toBe('overdrive_drill');
		expect(view.recommendedAction?.reason).toContain('Make cargo');
	});

	it('recall is not available before any cargo is secured', () => {
		const config = buildDefenseRunConfig({
			parts: starterSnapshots(),
			concentrationPercent: 67
		});
		const state = createDefenseRunState({ config });

		expect(applyDefenseAction(state, { kind: 'recall' })).toEqual({
			ok: false,
			reason: 'Defense action not available right now'
		});
	});

	it('starter defense does not start with repair verbs before components are in trouble', () => {
		const parts = starterSnapshots();
		const config = buildDefenseRunConfig({
			parts,
			concentrationPercent: 67
		});
		const state = createDefenseRunState({
			config,
			startingCondition: {
				drill: parts.find((part) => part.slot === 'drill')!.condition,
				pump: parts.find((part) => part.slot === 'pump')!.condition,
				hull: parts.find((part) => part.slot === 'hull')!.condition
			}
		});

		expect(getAvailableDefenseActions(state).some((action) => action.kind === 'patch_component')).toBe(
			false
		);
	});

	it('patch_component is unavailable when the component is already at its run cap', () => {
		const parts = starterSnapshots().map((part) =>
			part.slot === 'hull' ? { ...part, condition: 30 } : part
		);
		const config = buildDefenseRunConfig({
			parts,
			concentrationPercent: 67
		});
		const state = createDefenseRunState({
			config,
			startingCondition: {
				drill: parts.find((part) => part.slot === 'drill')!.condition,
				pump: parts.find((part) => part.slot === 'pump')!.condition,
				hull: parts.find((part) => part.slot === 'hull')!.condition
			}
		});

		expect(getAvailableDefenseActions(state).some((action) => action.kind === 'patch_component')).toBe(
			false
		);
		expect(applyDefenseAction(state, { kind: 'patch_component', target: 'hull' })).toEqual({
			ok: false,
			reason: 'Defense action not available right now'
		});
	});

	it('overdrive increases output pressure and wear risk', () => {
		const conservative = replayWithActions('overdrive-check', [
			{ tick: 0, kind: 'hold' },
			{ tick: 1, kind: 'hold' }
		]);
		const greedy = replayWithActions('overdrive-check', [
			{ tick: 0, kind: 'overdrive_drill' },
			{ tick: 1, kind: 'overdrive_drill' }
		]);
		expect(greedy.noise).toBeGreaterThan(conservative.noise);
		expect(greedy.componentCondition.drill).toBeLessThan(conservative.componentCondition.drill);
	});

	it('recall banks secured units and ends immediately', () => {
		const state = replayDefenseRun({
			runSeed: 'recall-seed',
			concentrationPercent: 67,
			parts: starterSnapshots(),
			actions: [
				{ tick: 0, kind: 'overdrive_drill' },
				{ tick: 1, kind: 'secure_cargo' },
				{ tick: 2, kind: 'recall' }
			],
			deployedAt: new Date('2026-06-20T12:00:00.000Z'),
			now: new Date('2026-06-20T12:00:30.000Z')
		});
		expect(state.recalled).toBe(true);
		expect(state.ended).toBe(true);
		const result = resolveDefenseRunResult(state);
		expect(result.resolutionType).toBe('defense_recalled');
		expect(result.recoveredQuantity).toBeGreaterThanOrEqual(0);
	});

	it('patch_component caps at deploy condition instead of item integrity floor', () => {
		const parts = starterSnapshots().map((part) =>
			part.slot === 'hull' ? { ...part, condition: 42 } : part
		);
		const config = buildDefenseRunConfig({
			parts,
			concentrationPercent: 67
		});
		const state = createDefenseRunState({
			config,
			startingCondition: {
				drill: parts.find((part) => part.slot === 'drill')!.condition,
				pump: parts.find((part) => part.slot === 'pump')!.condition,
				hull: parts.find((part) => part.slot === 'hull')!.condition
			}
		});
		state.componentCondition.hull = 34;

		expect(applyDefenseAction(state, { kind: 'patch_component', target: 'hull' })).toEqual({
			ok: true
		});
		expect(state.componentCondition.hull).toBeGreaterThan(34);
		expect(state.componentCondition.hull).toBeLessThanOrEqual(42);
	});

	it('patch stabilization does not persist repairs on claim', () => {
		const wornHull = starterSnapshots().map((part) =>
			part.slot === 'hull' ? { ...part, condition: 40 } : part
		);
		const deployedAt = new Date('2026-06-20T12:00:00.000Z');
		const state = replayDefenseRun({
			runSeed: 'patch-persist-seed',
			concentrationPercent: 67,
			parts: wornHull,
			actions: [{ tick: 0, kind: 'patch_component', target: 'hull' }],
			deployedAt,
			now: new Date(deployedAt.getTime() + DEFENSE_TICK_SECONDS * 1_000)
		});

		const result = resolveDefenseRunResult(state);
		expect(result.endingCondition.hull).toBe(state.lowestCondition.hull);
		expect(result.endingCondition.hull).toBeLessThanOrEqual(40);
	});

	it('better pump recovery changes base rate through chase_v2 config', () => {
		const worn = buildDefenseRunConfig({
			parts: starterSnapshots(),
			concentrationPercent: 67
		});
		const upgraded = buildDefenseRunConfig({
			parts: starterSnapshots().map((part) =>
				part.slot === 'pump'
					? {
							...part,
							propertyScores: {
								...part.propertyScores,
								recovery_efficiency: 85,
								clog_resistance: 80,
								field_stability: 80
							}
						}
					: part
			),
			concentrationPercent: 67
		});
		expect(upgraded.baseRate).toBeGreaterThan(worn.baseRate);
	});

	it('hull repairability scales patch_component heal and pressure cost', () => {
		const buildPatchedState = (repairability: number) => {
			const parts = starterSnapshots().map((part) =>
				part.slot === 'hull'
					? {
							...part,
							propertyScores: {
								...part.propertyScores,
								repairability
							}
						}
					: part
			);
			const config = buildDefenseRunConfig({
				parts,
				concentrationPercent: 67
			});
			const state = createDefenseRunState({
				config,
				startingCondition: {
					drill: parts.find((part) => part.slot === 'drill')!.condition,
					pump: parts.find((part) => part.slot === 'pump')!.condition,
					hull: parts.find((part) => part.slot === 'hull')!.condition
				}
			});
			state.componentCondition.hull = 30;
			state.pressure = 0;
			return state;
		};

		const lowRepair = buildPatchedState(20);
		const highRepair = buildPatchedState(90);
		expect(applyDefenseAction(lowRepair, { kind: 'patch_component', target: 'hull' })).toEqual({
			ok: true
		});
		expect(applyDefenseAction(highRepair, { kind: 'patch_component', target: 'hull' })).toEqual({
			ok: true
		});

		expect(highRepair.componentCondition.hull).toBeGreaterThan(lowRepair.componentCondition.hull);
		expect(highRepair.pressure).toBeLessThan(lowRepair.pressure);
	});
});
