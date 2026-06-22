import { applyRoutineUse, applySevereEvent, createItemDurability, isItemDisabled } from '../durability/itemDurability.js';
import {
	MATCHING_ACTION_WEAR_CONDITION,
	MATCHING_ACTION_WEAR_PART_SLOT
} from './eventWindowSeverity.js';
import type { ThumperEventWindowResponse } from './resolveThumperRunResult.js';
import type { ThumperComplicationId, ThumperEventActionId } from './types.js';
import type {
	ThumperPartRunModifiers,
	ThumperPartSlot,
	ThumperPartSnapshot,
	ThumperPartWearDelta
} from './thumperPartTypes.js';

const BASE_RUN_WEAR: Record<ThumperPartSlot, number> = {
	drill: 2,
	pump: 3,
	hull: 2
};

/** Score 0–100 → flat recovery bonus; worn ~35 baseline yields ~0. */
export function pumpRecoveryBonusFromEfficiency(recoveryEfficiencyScore: number): number {
	const score = Math.max(0, Math.min(100, recoveryEfficiencyScore));
	return Math.max(0, Math.round((score - 35) * 0.25));
}

/**
 * Condition affects output — at 0 Condition the part still exists but runs at half strength.
 */
export function partConditionPerformanceMultiplier(condition: number, integrity: number): number {
	if (isItemDisabled({ condition, integrity })) {
		return 0.5;
	}

	const cap = Math.max(1, integrity);
	return 0.5 + (Math.min(condition, cap) / cap) * 0.5;
}

export function computeThumperPartRunModifiers(
	parts: ThumperPartSnapshot[]
): ThumperPartRunModifiers {
	const pump = parts.find((part) => part.slot === 'pump');
	const drill = parts.find((part) => part.slot === 'drill');
	const hull = parts.find((part) => part.slot === 'hull');

	const pumpBonus = pump
		? pumpRecoveryBonusFromEfficiency(pump.propertyScores.recovery_efficiency ?? 0)
		: 0;

	const multipliers = [drill, pump, hull]
		.filter((part): part is ThumperPartSnapshot => part !== undefined)
		.map((part) => partConditionPerformanceMultiplier(part.condition, part.integrity));

	const performanceMultiplier =
		multipliers.length > 0
			? multipliers.reduce((product, value) => product * value, 1) ** (1 / multipliers.length)
			: 1;

	return {
		pumpRecoveryBonus: pumpBonus,
		performanceMultiplier
	};
}

export type ThumperEventWindowWearInput = {
	windowIndex: number;
	complication: ThumperComplicationId | string;
	chosenResponse: ThumperEventWindowResponse['chosenResponse'] | string;
	matchingAction: ThumperEventActionId | 'pressure_moment';
	defenseActionWear?: Partial<Record<ThumperPartSlot, number>>;
};

export function computeRunPartWearDeltas(
	responses: ThumperEventWindowWearInput[],
	options: { isPushRun: boolean }
): Record<ThumperPartSlot, ThumperPartWearDelta> {
	const deltas: Record<ThumperPartSlot, ThumperPartWearDelta> = {
		drill: { conditionLoss: BASE_RUN_WEAR.drill },
		pump: { conditionLoss: BASE_RUN_WEAR.pump },
		hull: { conditionLoss: BASE_RUN_WEAR.hull }
	};

	for (const response of responses) {
		if (response.chosenResponse === 'recall_early') {
			continue;
		}

		if (response.defenseActionWear) {
			for (const [slot, loss] of Object.entries(response.defenseActionWear) as Array<
				[ThumperPartSlot, number | undefined]
			>) {
				if (loss && loss > 0) {
					deltas[slot].conditionLoss += loss;
				}
			}
			continue;
		}

		if (response.complication === 'pump_strain' && response.chosenResponse === 'hold') {
			deltas.pump.conditionLoss += 4;
		}

		if (response.complication === 'threat_surge' && response.chosenResponse === 'hold') {
			deltas.hull.integrityLoss = (deltas.hull.integrityLoss ?? 0) + 1;
		}

		// hull_damage + hold applies immediate wear during the event response — not again at claim.

		if (
			response.chosenResponse === response.matchingAction &&
			response.chosenResponse !== 'field_repair' &&
			response.chosenResponse in MATCHING_ACTION_WEAR_PART_SLOT
		) {
			const slot =
				MATCHING_ACTION_WEAR_PART_SLOT[
					response.chosenResponse as keyof typeof MATCHING_ACTION_WEAR_PART_SLOT
				];
			deltas[slot].conditionLoss += MATCHING_ACTION_WEAR_CONDITION;
		}
	}

	if (options.isPushRun && responses.some((response) => response.chosenResponse === 'hold')) {
		deltas.pump.integrityLoss = (deltas.pump.integrityLoss ?? 0) + 1;
	}

	return deltas;
}

/** Apply wear only to parts that were on the run — not other inventory items. */
export function applyWearToRunParts(
	parts: ThumperPartSnapshot[],
	deltas: Record<ThumperPartSlot, ThumperPartWearDelta>
): ThumperPartSnapshot[] {
	return parts.map((part) => {
		const wear = deltas[part.slot];
		const afterRoutine = applyRoutineUse(
			{ condition: part.condition, integrity: part.integrity },
			wear.conditionLoss
		);
		const afterSevere =
			wear.integrityLoss && wear.integrityLoss > 0
				? applySevereEvent(afterRoutine, { conditionLoss: 0, integrityLoss: wear.integrityLoss })
				: afterRoutine;
		const normalized = createItemDurability(afterSevere);

		return {
			...part,
			condition: normalized.condition,
			integrity: normalized.integrity
		};
	});
}

/** Actual condition/integrity lost after clamped durability math — not requested wear. */
export function deriveAppliedWearDeltas(
	beforeParts: ThumperPartSnapshot[],
	afterParts: ThumperPartSnapshot[]
): Record<ThumperPartSlot, ThumperPartWearDelta> {
	const afterBySlot = Object.fromEntries(afterParts.map((part) => [part.slot, part])) as Record<
		ThumperPartSlot,
		ThumperPartSnapshot | undefined
	>;

	const deltas: Record<ThumperPartSlot, ThumperPartWearDelta> = {
		drill: { conditionLoss: 0 },
		pump: { conditionLoss: 0 },
		hull: { conditionLoss: 0 }
	};

	for (const before of beforeParts) {
		const after = afterBySlot[before.slot];
		if (!after) {
			continue;
		}

		const conditionLoss = Math.max(0, before.condition - after.condition);
		const integrityLoss = Math.max(0, before.integrity - after.integrity);
		deltas[before.slot] = {
			conditionLoss,
			...(integrityLoss > 0 ? { integrityLoss } : {})
		};
	}

	return deltas;
}

export function totalAppliedWearFromDeltas(
	deltas: Record<ThumperPartSlot, ThumperPartWearDelta>
): number {
	return Object.values(deltas).reduce(
		(total, delta) => total + delta.conditionLoss + (delta.integrityLoss ?? 0),
		0
	);
}
