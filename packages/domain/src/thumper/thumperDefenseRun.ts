import { OLD_RUNDOWN_SMALL_PERSONAL_THUMPER } from './smallPersonalThumperPreset.js';
import {
	computeChaseV2ComponentEffects,
	defenseBaseRateFromParts,
	type ChaseV2ComponentEffects
} from './chaseV2ComponentEffects.js';
import type { ThumperPartSnapshot } from './thumperPartTypes.js';

export const DEFENSE_TICK_SECONDS = 10;
export const DEFENSE_RUN_TICKS = 18;
export const DEFENSE_RUN_DURATION_SECONDS = DEFENSE_RUN_TICKS * DEFENSE_TICK_SECONDS;

export const DEFENSE_LANES = ['drill', 'pump', 'hull', 'cargo'] as const;
export type DefenseLane = (typeof DEFENSE_LANES)[number];

export const DEFENSE_ACTION_KINDS = [
	'hold',
	'recall',
	'secure_cargo',
	'clear_lane',
	'vent_pump',
	'brace_hull',
	'overdrive_drill',
	'patch_component',
	'redirect_threat'
] as const;
export type DefenseActionKind = (typeof DEFENSE_ACTION_KINDS)[number];

export type DefenseActionLogEntry = {
	tick: number;
	kind: DefenseActionKind;
	target?: string;
};

export type DefenseThreat = {
	id: string;
	lane: DefenseLane;
	severity: number;
	eta: number;
	pressure: number;
	noise: number;
	split: boolean;
};

export type DefenseComponentCondition = Record<'drill' | 'pump' | 'hull', number>;

export type DefenseRunConfig = {
	baseRate: number;
	secureCargoCapacity: number;
	startingPressure: number;
	startingNoise: number;
	overdriveBonus: number;
	spawnPressureBias: number;
	pressureDecay: number;
	noiseDecay: number;
	maxCondition: DefenseComponentCondition;
	componentEffects: ChaseV2ComponentEffects;
};

export type DefenseRunState = {
	config: DefenseRunConfig;
	secured: number;
	atRisk: number;
	cargoLost: number;
	pressure: number;
	noise: number;
	overdriveTicks: number;
	hullBraceCharges: number;
	ended: boolean;
	failed: boolean;
	recalled: boolean;
	componentCondition: DefenseComponentCondition;
	/** Lowest condition seen this run — patch stabilization does not raise claim-time condition. */
	lowestCondition: DefenseComponentCondition;
	cooldowns: Record<string, number>;
	threats: DefenseThreat[];
	currentTick: number;
	startingCondition: DefenseComponentCondition;
};

export type DefenseRunView = {
	progressPercent: number;
	securedYield: number;
	atRiskYield: number;
	cargoLost: number;
	pressure: number;
	noise: number;
	projectNeedUnits: number;
	secureCargoCapacity: number;
	currentTick: number;
	totalTicks: number;
	secondsPerTick: number;
	nextTickInSeconds: number;
	ended: boolean;
	failed: boolean;
	recalled: boolean;
	threats: DefenseThreat[];
	componentCondition: DefenseComponentCondition;
	availableActions: DefenseActionLogEntry[];
	recommendedAction: (DefenseActionLogEntry & { reason: string }) | null;
	placeholderMessage: string | null;
};

const ACTION_COOLDOWNS: Record<DefenseActionKind, number> = {
	hold: 0,
	recall: 0,
	clear_lane: 1,
	vent_pump: 3,
	brace_hull: 3,
	secure_cargo: 2,
	overdrive_drill: 4,
	patch_component: 5,
	redirect_threat: 3
};

const ARCHETYPES = [
	{ id: 'cargo_raid', lane: 'cargo', severity: 18, eta: 2, pressure: 0, noise: 3, split: false },
	{ id: 'cargo_spill', lane: 'cargo', severity: 13, eta: 1, pressure: 0, noise: 2, split: false },
	{ id: 'hull_breach', lane: 'hull', severity: 22, eta: 2, pressure: 5, noise: 0, split: false },
	{ id: 'hull_crack', lane: 'hull', severity: 15, eta: 1, pressure: 3, noise: 0, split: false },
	{ id: 'pump_surge', lane: 'pump', severity: 20, eta: 2, pressure: 8, noise: 0, split: false },
	{ id: 'pump_clog', lane: 'pump', severity: 13, eta: 1, pressure: 5, noise: 0, split: false },
	{ id: 'drill_jam', lane: 'drill', severity: 16, eta: 2, pressure: 3, noise: 0, split: false },
	{ id: 'drill_snag', lane: 'drill', severity: 11, eta: 1, pressure: 2, noise: 0, split: false },
	{ id: 'noise_swell', lane: 'cargo', severity: 14, eta: 2, pressure: 0, noise: 15, split: false },
	{ id: 'split_pressure', lane: 'pump', severity: 17, eta: 2, pressure: 6, noise: 0, split: true },
	{ id: 'ambush', lane: 'cargo', severity: 24, eta: 1, pressure: 0, noise: 6, split: false },
	{ id: 'cascade', lane: 'pump', severity: 25, eta: 1, pressure: 10, noise: 0, split: true }
] as const;

function hashSeed(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

export class SeededRng {
	private state: number;

	constructor(seed: string) {
		this.state = hashSeed(seed);
	}

	next(): number {
		this.state += 0x6d2b79f5;
		let value = this.state;
		value = Math.imul(value ^ (value >>> 15), value | 1);
		value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
		return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
	}

	nextInt(min: number, max: number): number {
		return min + Math.floor(this.next() * (max - min + 1));
	}

	choice<T>(values: readonly T[]): T {
		return values[Math.floor(this.next() * values.length)]!;
	}

	gauss(mean: number, stdDev: number): number {
		const u1 = Math.max(this.next(), 1e-9);
		const u2 = this.next();
		const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
		return mean + z * stdDev;
	}
}

function clamp(value: number, lower: number, upper: number): number {
	return Math.max(lower, Math.min(upper, value));
}

export function buildDefenseRunConfig(input: {
	parts: ThumperPartSnapshot[];
	concentrationPercent: number;
}): DefenseRunConfig {
	const preset = OLD_RUNDOWN_SMALL_PERSONAL_THUMPER;
	const startingCondition = startingConditionFromParts(input.parts);
	const effects = computeChaseV2ComponentEffects(input.parts);
	const baseRate = defenseBaseRateFromParts({
		parts: input.parts,
		concentrationPercent: input.concentrationPercent,
		baseExtractionRate: preset.baseStats.baseExtractionRate
	});

	return {
		baseRate,
		secureCargoCapacity: Math.max(
			10,
			preset.baseStats.secureCargoCapacity * 0.45 + effects.secureCargoCapacity * 0.55
		),
		startingPressure: preset.baseStats.startingPressure,
		startingNoise: preset.baseStats.startingNoise,
		overdriveBonus: preset.baseStats.overdriveYieldMultiplier,
		spawnPressureBias: 0.08 * effects.pumpHazardMultiplier,
		pressureDecay: 2 * effects.fieldStabilityMultiplier,
		noiseDecay: 2.4 * effects.fieldStabilityMultiplier,
		/** Patch stabilizes up to deploy-time condition — not item integrity floor. */
		maxCondition: startingCondition,
		componentEffects: effects
	};
}

function startingConditionFromParts(parts: ThumperPartSnapshot[]): DefenseComponentCondition {
	const drill = parts.find((part) => part.slot === 'drill');
	const pump = parts.find((part) => part.slot === 'pump');
	const hull = parts.find((part) => part.slot === 'hull');
	return {
		drill: drill?.condition ?? OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.starterParts[0]!.condition,
		pump: pump?.condition ?? OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.starterParts[1]!.condition,
		hull: hull?.condition ?? OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.starterParts[2]!.condition
	};
}

export function createDefenseRunState(input: {
	config: DefenseRunConfig;
	startingCondition?: DefenseComponentCondition;
}): DefenseRunState {
	const startingCondition = input.startingCondition ?? {
		drill: 68,
		pump: 62,
		hull: 72
	};

	return {
		config: input.config,
		secured: 0,
		atRisk: 0,
		cargoLost: 0,
		pressure: input.config.startingPressure,
		noise: input.config.startingNoise,
		overdriveTicks: 0,
		hullBraceCharges: 0,
		ended: false,
		failed: false,
		recalled: false,
		componentCondition: { ...startingCondition },
		lowestCondition: { ...startingCondition },
		cooldowns: {},
		threats: [],
		currentTick: 0,
		startingCondition: { ...startingCondition }
	};
}

function lanesWithThreats(state: DefenseRunState): DefenseLane[] {
	return [...new Set(state.threats.map((threat) => threat.lane))].sort();
}

function laneLabel(lane: DefenseLane): string {
	const labels: Record<DefenseLane, string> = {
		cargo: 'Cargo',
		hull: 'Hull',
		pump: 'Pump',
		drill: 'Drill'
	};
	return labels[lane];
}

function lanePressure(state: DefenseRunState, lane: DefenseLane): number {
	return state.threats
		.filter((threat) => threat.lane === lane)
		.reduce((total, threat) => total + threat.severity / Math.max(1, threat.eta), 0);
}

function makeThreat(
	archetype: (typeof ARCHETYPES)[number],
	rng: SeededRng,
	spawnId: string
): DefenseThreat {
	return {
		id: spawnId,
		lane: archetype.lane as DefenseLane,
		severity: Math.max(4, archetype.severity + rng.nextInt(-4, 5)),
		eta: Math.max(1, archetype.eta + rng.choice([-1, 0, 0, 1])),
		pressure: archetype.pressure,
		noise: archetype.noise,
		split: archetype.split
	};
}

function decrementCooldowns(state: DefenseRunState): void {
	for (const action of Object.keys(ACTION_COOLDOWNS)) {
		state.cooldowns[action] = Math.max(0, (state.cooldowns[action] ?? 0) - 1);
	}
}

function spawnThreats(state: DefenseRunState, rng: SeededRng, tick: number): void {
	let spawnIndex = state.threats.length;
	const pushThreat = () => {
		const spawnId = `${tick}-${spawnIndex}`;
		spawnIndex += 1;
		state.threats.push(makeThreat(rng.choice(ARCHETYPES), rng, spawnId));
	};

	const spawnChance =
		0.24 + state.config.spawnPressureBias + state.noise / 340 + state.pressure / 460;
	if (rng.next() < spawnChance) {
		pushThreat();
	}

	const overlapChance = 0.04 + state.noise / 520 + Math.max(0, state.pressure - 65) / 650;
	if (rng.next() < overlapChance) {
		pushThreat();
	}

	if ((tick === 6 || tick === 12) && rng.next() < 0.45) {
		pushThreat();
	}
}

function tickYield(state: DefenseRunState, rng: SeededRng): void {
	const drillFactor = state.componentCondition.drill / 100;
	const pumpFactor = state.componentCondition.pump / 100;
	let rate =
		state.config.baseRate +
		drillFactor * 0.55 * state.config.componentEffects.extractionRateMultiplier +
		pumpFactor * 0.35 * state.config.componentEffects.recoveryMultiplier;

	if (state.overdriveTicks > 0) {
		rate += state.config.overdriveBonus;
		state.overdriveTicks -= 1;
	}
	if (state.pressure >= 80) {
		rate -= 0.85;
	}
	if (state.noise >= 95) {
		rate -= 0.35;
	}

	const generated = Math.max(0, rate + rng.gauss(0, 0.45));
	const sealedByDefault = Math.min(generated * 0.28, 1);
	state.secured += sealedByDefault;
	state.atRisk += Math.max(0, generated - sealedByDefault);
}

function removeWorstThreat(state: DefenseRunState, lane: DefenseLane): void {
	const laneThreats = state.threats
		.map((threat, index) => ({ threat, index }))
		.filter((entry) => entry.threat.lane === lane);
	if (laneThreats.length === 0) {
		return;
	}
	const worst = laneThreats.reduce((best, entry) => {
		const score = (entry.threat.eta <= 1 ? 1 : 0) + entry.threat.severity;
		const bestScore = (best.threat.eta <= 1 ? 1 : 0) + best.threat.severity;
		return score > bestScore ? entry : best;
	});
	state.threats.splice(worst.index, 1);
}

function resolveThreats(state: DefenseRunState): void {
	const remaining: DefenseThreat[] = [];
	const effects = state.config.componentEffects;

	for (const threat of state.threats) {
		const nextThreat = { ...threat, eta: threat.eta - 1 };
		if (nextThreat.eta > 0) {
			remaining.push(nextThreat);
			continue;
		}

		let severity = nextThreat.severity;
		if (state.hullBraceCharges > 0 && (nextThreat.lane === 'hull' || nextThreat.lane === 'cargo')) {
			severity *= 0.32;
			state.hullBraceCharges -= 1;
		}

		if (nextThreat.lane === 'cargo') {
			const loss = Math.min(
				state.atRisk,
				severity * 0.34 * effects.fieldStabilityMultiplier
			);
			state.atRisk -= loss;
			state.cargoLost += loss;
			state.noise += 4 + nextThreat.noise;
			state.componentCondition.hull -= severity * 0.025 * effects.hullDamageMultiplier;
		} else if (nextThreat.lane === 'hull') {
			state.componentCondition.hull -= severity * 0.32 * effects.hullDamageMultiplier;
			if (state.componentCondition.hull <= 35) {
				const securedLoss = Math.min(state.secured, severity * 0.1);
				state.secured -= securedLoss;
				state.cargoLost += securedLoss;
			}
			state.pressure += nextThreat.pressure;
		} else if (nextThreat.lane === 'pump') {
			state.pressure += severity * 0.55 * effects.pumpHazardMultiplier + nextThreat.pressure;
			state.componentCondition.pump -= severity * 0.09 * effects.pumpWearMultiplier;
		} else if (nextThreat.lane === 'drill') {
			state.atRisk = Math.max(0, state.atRisk - severity * 0.18);
			state.componentCondition.drill -= severity * 0.18 * effects.drillWearMultiplier;
			state.pressure += nextThreat.pressure;
		}

		if (nextThreat.split) {
			const splitLane: DefenseLane = nextThreat.lane === 'pump' ? 'hull' : 'pump';
			remaining.push({
				id: `${nextThreat.id}_split`,
				lane: splitLane,
				severity: Math.max(6, severity * 0.45),
				eta: 1,
				pressure: 2,
				noise: 2,
				split: false
			});
		}
	}

	state.threats = remaining;
}

function passiveDecay(state: DefenseRunState, rng: SeededRng): void {
	if (state.pressure >= 88) {
		state.componentCondition.pump -= 0.5 * state.config.componentEffects.pumpWearMultiplier;
		state.componentCondition.hull -= 0.15 * state.config.componentEffects.hullDamageMultiplier;
		state.atRisk = Math.max(0, state.atRisk - 0.25);
	}
	if (state.noise >= 95 && rng.next() < 0.35) {
		state.pressure += 4;
	}
	if (state.componentCondition.hull <= 25) {
		const loss = Math.min(state.secured, 0.35);
		state.cargoLost += loss;
		state.secured = Math.max(0, state.secured - loss);
	}

	state.pressure = clamp(state.pressure - state.config.pressureDecay, 0, 135);
	state.noise = clamp(state.noise - state.config.noiseDecay, 0, 135);
	for (const component of ['drill', 'pump', 'hull'] as const) {
		state.componentCondition[component] = clamp(state.componentCondition[component], 0, 100);
	}
	if (Math.min(...Object.values(state.componentCondition)) <= 0) {
		state.failed = true;
		state.ended = true;
		state.secured *= 0.55;
	}
	syncLowestCondition(state);
}

function syncLowestCondition(state: DefenseRunState): void {
	for (const component of ['drill', 'pump', 'hull'] as const) {
		state.lowestCondition[component] = Math.min(
			state.lowestCondition[component],
			state.componentCondition[component]
		);
	}
}

function finishUnrecalledRun(state: DefenseRunState): void {
	if (state.ended) {
		return;
	}
	const hullFactor = state.componentCondition.hull / 100;
	const pressurePenalty = state.pressure > 80 ? 0.1 : 0;
	const secureFraction = clamp(0.5 + hullFactor * 0.2 - pressurePenalty, 0.32, 0.7);
	const secured = state.atRisk * secureFraction;
	state.secured += secured;
	state.cargoLost += state.atRisk - secured;
	state.atRisk = 0;
	state.ended = true;
}

export function getAvailableDefenseActions(state: DefenseRunState): DefenseActionLogEntry[] {
	if (state.ended) {
		return [];
	}

	const actions: DefenseActionLogEntry[] = [{ tick: state.currentTick, kind: 'hold' }];
	if (state.secured >= 1) {
		actions.push({ tick: state.currentTick, kind: 'recall' });
	}

	if ((state.cooldowns.secure_cargo ?? 0) <= 0 && state.atRisk >= 2) {
		actions.push({ tick: state.currentTick, kind: 'secure_cargo' });
	}
	if ((state.cooldowns.vent_pump ?? 0) <= 0) {
		actions.push({ tick: state.currentTick, kind: 'vent_pump' });
	}
	if ((state.cooldowns.brace_hull ?? 0) <= 0) {
		actions.push({ tick: state.currentTick, kind: 'brace_hull' });
	}
	if ((state.cooldowns.overdrive_drill ?? 0) <= 0) {
		actions.push({ tick: state.currentTick, kind: 'overdrive_drill' });
	}
	if ((state.cooldowns.redirect_threat ?? 0) <= 0 && state.threats.length > 0) {
		for (const lane of lanesWithThreats(state)) {
			actions.push({ tick: state.currentTick, kind: 'redirect_threat', target: lane });
		}
	}
	if ((state.cooldowns.clear_lane ?? 0) <= 0 && state.threats.length > 0) {
		for (const lane of lanesWithThreats(state)) {
			actions.push({ tick: state.currentTick, kind: 'clear_lane', target: lane });
		}
	}
	if ((state.cooldowns.patch_component ?? 0) <= 0) {
		for (const [component, condition] of Object.entries(state.componentCondition)) {
			const repairCap = state.config.maxCondition[component as keyof DefenseComponentCondition];
			if (condition <= 50 && condition < repairCap - 0.5) {
				actions.push({
					tick: state.currentTick,
					kind: 'patch_component',
					target: component
				});
			}
		}
	}

	return actions;
}

function findDefenseAction(
	actions: DefenseActionLogEntry[],
	kind: DefenseActionKind,
	target?: string
): DefenseActionLogEntry | null {
	return (
		actions.find(
			(action) => action.kind === kind && (action.target ?? null) === (target ?? null)
		) ?? null
	);
}

function worstThreat(threats: DefenseThreat[]): DefenseThreat | null {
	if (threats.length === 0) {
		return null;
	}
	return [...threats].sort((left, right) => {
		if (left.eta !== right.eta) {
			return left.eta - right.eta;
		}
		return right.severity - left.severity;
	})[0]!;
}

function recommendDefenseAction(
	state: DefenseRunState,
	actions: DefenseActionLogEntry[]
): (DefenseActionLogEntry & { reason: string }) | null {
	if (state.ended) {
		return null;
	}

	const threat = worstThreat(state.threats);
	if (threat) {
		const clear = findDefenseAction(actions, 'clear_lane', threat.lane);
		const redirect = findDefenseAction(actions, 'redirect_threat', threat.lane);
		const brace = findDefenseAction(actions, 'brace_hull');
		if (threat.eta <= 1 && clear) {
			return {
				...clear,
				reason: `${laneLabel(threat.lane)} is hitting now. Clear it before choosing cargo.`
			};
		}
		if (threat.eta <= 1 && (threat.lane === 'cargo' || threat.lane === 'hull') && brace) {
			return {
				...brace,
				reason: `${laneLabel(threat.lane)} is hitting now. Brace to soften the hit.`
			};
		}
		if (threat.eta <= 2 && clear) {
			return {
				...clear,
				reason: `${laneLabel(threat.lane)} hits soon. Clearing it buys the safest step.`
			};
		}
		if (threat.eta <= 2 && redirect) {
			return {
				...redirect,
				reason: `${laneLabel(threat.lane)} hits soon. Delay it if you want more time.`
			};
		}
	}

	const secure = findDefenseAction(actions, 'secure_cargo');
	if (secure && state.atRisk >= Math.max(3, state.config.secureCargoCapacity * 0.5)) {
		return {
			...secure,
			reason: 'Loose cargo is waiting. Bank it into secured yield.'
		};
	}

	const vent = findDefenseAction(actions, 'vent_pump');
	if (vent && state.pressure >= 75) {
		return {
			...vent,
			reason: 'Pressure is high. Vent before it starts eating the run.'
		};
	}

	if (secure) {
		return {
			...secure,
			reason: 'Bank the loose cargo you already made.'
		};
	}

	const overdrive = findDefenseAction(actions, 'overdrive_drill');
	if (overdrive && state.atRisk < 2 && state.pressure < 70) {
		return {
			...overdrive,
			reason: 'No loose cargo yet. Make cargo, then bank it.'
		};
	}

	const brace = findDefenseAction(actions, 'brace_hull');
	if (brace) {
		return {
			...brace,
			reason: 'No urgent cargo move is ready. Brace the next hull or cargo hit.'
		};
	}

	return null;
}

export function applyDefenseAction(
	state: DefenseRunState,
	action: Omit<DefenseActionLogEntry, 'tick'>
): { ok: true } | { ok: false; reason: string } {
	const available = getAvailableDefenseActions(state);
	const allowed = available.some(
		(candidate) =>
			candidate.kind === action.kind &&
			(candidate.target ?? null) === (action.target ?? null)
	);
	if (!allowed) {
		return { ok: false, reason: 'Defense action not available right now' };
	}

	if (action.kind !== 'hold') {
		state.cooldowns[action.kind] = ACTION_COOLDOWNS[action.kind];
	}

	if (action.kind === 'recall') {
		if (state.secured < 1) {
			return { ok: false, reason: 'Secure cargo before recalling' };
		}
		state.recalled = true;
		state.ended = true;
		return { ok: true };
	}
	if (action.kind === 'secure_cargo') {
		const move = Math.min(state.atRisk, state.config.secureCargoCapacity);
		state.secured += move;
		state.atRisk -= move;
		state.pressure += 7;
		state.noise += 2;
		return { ok: true };
	}
	if (action.kind === 'clear_lane' && action.target) {
		removeWorstThreat(state, action.target as DefenseLane);
		state.componentCondition.drill -= 0.6 * state.config.componentEffects.drillWearMultiplier;
		state.noise = Math.max(0, state.noise - 4);
		return { ok: true };
	}
	if (action.kind === 'vent_pump') {
		state.pressure = Math.max(0, state.pressure - 30);
		state.noise = Math.max(0, state.noise - 7);
		state.atRisk = Math.max(0, state.atRisk - 2.5);
		state.overdriveTicks = 0;
		return { ok: true };
	}
	if (action.kind === 'brace_hull') {
		state.hullBraceCharges = Math.max(state.hullBraceCharges, 2);
		state.pressure += 4;
		return { ok: true };
	}
	if (action.kind === 'overdrive_drill') {
		state.overdriveTicks = 2;
		state.pressure += 12;
		state.noise += 20;
		state.componentCondition.drill -= 1.5 * state.config.componentEffects.drillWearMultiplier;
		return { ok: true };
	}
	if (action.kind === 'patch_component' && action.target) {
		const component = action.target as keyof DefenseComponentCondition;
		if (component in state.componentCondition) {
			const repairPressureMultiplier = state.config.componentEffects.repairPressureMultiplier;
			const patchHeal = 9 * (2 - repairPressureMultiplier);
			const patchPressure = 3 * repairPressureMultiplier;
			state.componentCondition[component] = Math.min(
				state.config.maxCondition[component],
				state.componentCondition[component] + patchHeal
			);
			state.atRisk = Math.max(0, state.atRisk - 2);
			state.pressure += patchPressure;
		}
		return { ok: true };
	}
	if (action.kind === 'redirect_threat' && action.target) {
		const lane = action.target as DefenseLane;
		const sorted = [...state.threats].sort((left, right) => left.eta - right.eta);
		const threat = sorted.find((entry) => entry.lane === lane);
		if (threat) {
			threat.eta += 1;
			threat.severity *= 0.8;
			state.noise += 7;
			state.pressure += 4;
		}
		return { ok: true };
	}

	return { ok: true };
}

function actionForTick(
	actions: DefenseActionLogEntry[],
	tick: number
): Omit<DefenseActionLogEntry, 'tick'> {
	const entry = actions.find((action) => action.tick === tick);
	if (!entry) {
		return { kind: 'hold' };
	}
	return { kind: entry.kind, target: entry.target };
}

function runDefenseTick(state: DefenseRunState, rng: SeededRng, tick: number, actions: DefenseActionLogEntry[]): void {
	decrementCooldowns(state);
	tickYield(state, rng);
	spawnThreats(state, rng, tick);

	const action = actionForTick(actions, tick);
	applyDefenseAction(state, action);
	resolveThreats(state);
	passiveDecay(state, rng);
	state.currentTick = tick + 1;
}

export function replayDefenseRun(input: {
	runSeed: string;
	concentrationPercent: number;
	parts: ThumperPartSnapshot[];
	actions: DefenseActionLogEntry[];
	deployedAt: Date;
	now: Date;
}): DefenseRunState {
	const config = buildDefenseRunConfig({
		parts: input.parts,
		concentrationPercent: input.concentrationPercent
	});
	const state = createDefenseRunState({
		config,
		startingCondition: startingConditionFromParts(input.parts)
	});

	const elapsedMs = Math.max(0, input.now.getTime() - input.deployedAt.getTime());
	const elapsedTicks = Math.min(
		DEFENSE_RUN_TICKS,
		Math.floor(elapsedMs / (DEFENSE_TICK_SECONDS * 1000))
	);

	const sortedActions = [...input.actions].sort((left, right) => left.tick - right.tick);
	const rng = new SeededRng(input.runSeed);

	for (let tick = 0; tick < elapsedTicks && !state.ended; tick += 1) {
		runDefenseTick(state, rng, tick, sortedActions);
	}

	if (!state.ended && elapsedTicks >= DEFENSE_RUN_TICKS) {
		finishUnrecalledRun(state);
	}

	return state;
}

export function resolveDefenseRunResult(state: DefenseRunState): {
	recoveredQuantity: number;
	wasteQuantity: number;
	forfeitedRecovery: number;
	appliedWear: number;
	explanation: string;
	resolutionType: 'defense_completed' | 'defense_recalled' | 'defense_failed';
	recallReason: string | null;
	endingCondition: DefenseComponentCondition;
	cargoLost: number;
} {
	const recoveredQuantity =
		!state.failed && state.secured > 0
			? Math.max(1, Math.floor(state.secured))
			: Math.max(0, Math.floor(state.secured));
	const wasteQuantity = Math.max(0, Math.floor(state.cargoLost));
	const endingCondition = persistentDefenseComponentCondition(state);
	const gearLoss =
		(state.startingCondition.drill - endingCondition.drill) +
		(state.startingCondition.pump - endingCondition.pump) +
		(state.startingCondition.hull - endingCondition.hull);

	let resolutionType: 'defense_completed' | 'defense_recalled' | 'defense_failed' = 'defense_completed';
	let recallReason: string | null = null;
	if (state.failed) {
		resolutionType = 'defense_failed';
	} else if (state.recalled) {
		resolutionType = 'defense_recalled';
		recallReason = 'Player recalled and banked secured cargo.';
	}

	const explanation = [
		`Defense run secured ${recoveredQuantity}u.`,
		wasteQuantity > 0 ? `${wasteQuantity}u lost to cargo hits.` : null,
		gearLoss > 0 ? `Components took ${Math.round(gearLoss)} total condition wear.` : null,
		state.recalled ? 'Run ended early on recall.' : 'Run completed after the encounter timer.'
	]
		.filter(Boolean)
		.join(' ');

	return {
		recoveredQuantity,
		wasteQuantity,
		forfeitedRecovery: wasteQuantity,
		appliedWear: Math.round(gearLoss),
		explanation,
		resolutionType,
		recallReason,
		endingCondition,
		cargoLost: state.cargoLost
	};
}

/** Patch is in-run stabilization only — claim persists lowest wear seen, not temporary repairs. */
export function persistentDefenseComponentCondition(
	state: DefenseRunState
): DefenseComponentCondition {
	return {
		drill: Math.round(state.lowestCondition.drill),
		pump: Math.round(state.lowestCondition.pump),
		hull: Math.round(state.lowestCondition.hull)
	};
}

export function buildDefenseRunView(input: {
	state: DefenseRunState;
	projectNeedUnits: number;
	deployedAt: Date;
	now: Date;
}): DefenseRunView {
	const elapsedMs = Math.max(0, input.now.getTime() - input.deployedAt.getTime());
	const progressPercent = Math.min(
		100,
		(elapsedMs / (DEFENSE_RUN_DURATION_SECONDS * 1000)) * 100
	);
	const tickMs = DEFENSE_TICK_SECONDS * 1000;
	const elapsedIntoTickMs = elapsedMs % tickMs;
	const nextTickInSeconds = input.state.ended
		? 0
		: Math.max(1, Math.ceil((tickMs - elapsedIntoTickMs) / 1000));
	const availableActions = getAvailableDefenseActions(input.state);

	return {
		progressPercent,
		securedYield: Math.floor(input.state.secured),
		atRiskYield: Math.floor(input.state.atRisk),
		cargoLost: Math.floor(input.state.cargoLost),
		pressure: Math.round(input.state.pressure),
		noise: Math.round(input.state.noise),
		projectNeedUnits: input.projectNeedUnits,
		secureCargoCapacity: Math.floor(input.state.config.secureCargoCapacity),
		currentTick: input.state.currentTick,
		totalTicks: DEFENSE_RUN_TICKS,
		secondsPerTick: DEFENSE_TICK_SECONDS,
		nextTickInSeconds,
		ended: input.state.ended,
		failed: input.state.failed,
		recalled: input.state.recalled,
		threats: input.state.threats.map((threat) => ({ ...threat })),
		componentCondition: { ...input.state.componentCondition },
		availableActions,
		recommendedAction: recommendDefenseAction(input.state, availableActions),
		placeholderMessage: input.state.ended ? null : 'Defend the thumper — clear lanes, secure cargo, or recall.'
	};
}

export function isDefenseRunEnded(state: DefenseRunState): boolean {
	return state.ended;
}

export function defenseWearDeltasFromRun(
	before: DefenseComponentCondition,
	after: DefenseComponentCondition
): Record<'drill' | 'pump' | 'hull', { conditionLoss: number }> {
	return {
		drill: { conditionLoss: Math.max(0, before.drill - after.drill) },
		pump: { conditionLoss: Math.max(0, before.pump - after.pump) },
		hull: { conditionLoss: Math.max(0, before.hull - after.hull) }
	};
}
