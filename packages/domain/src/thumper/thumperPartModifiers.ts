import { applyRoutineUse, applySevereEvent, createItemDurability, isItemDisabled } from '../durability/itemDurability.js';
import type { ThumperEventWindowResponse } from './resolveThumperRunResult.js';
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

export function computeRunPartWearDeltas(
	responses: ThumperEventWindowResponse[],
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

		if (response.complication === 'pump_strain' && response.chosenResponse === 'hold') {
			deltas.pump.conditionLoss += 4;
		}

		if (response.complication === 'threat_surge' && response.chosenResponse === 'hold') {
			deltas.hull.integrityLoss = (deltas.hull.integrityLoss ?? 0) + 1;
		}

		if (response.complication === 'hull_damage' && response.chosenResponse === 'hold') {
			deltas.hull.conditionLoss += 5;
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
