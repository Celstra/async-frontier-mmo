import {
	applyNormalRepair,
	applySevereEvent,
	createItemDurability
} from './itemDurability.js';
import type { ItemDurability } from './types.js';

export type FieldRepairKitScores = {
	conditionRestored: number;
	integritySafety: number;
	fieldReliability: number;
};

export type FieldRepairOutcome = {
	durability: ItemDurability;
	conditionBefore: number;
	conditionAfter: number;
	integrityBefore: number;
	integrityAfter: number;
	conditionRestored: number;
	explanation: string;
};

/** MVP: partial restore from kit property score — not a full heal. */
export function conditionRestoredPointsFromKitScore(conditionRestoredScore: number): number {
	const score = Math.max(0, Math.min(100, conditionRestoredScore));
	return Math.round(12 + (score / 100) * 16);
}

/** Integrity Safety mitigates proposed Integrity loss during pressured field repair. */
export function integrityLossMitigatedFromSafetyScore(
	proposedIntegrityLoss: number,
	integritySafetyScore: number
): number {
	if (proposedIntegrityLoss <= 0) {
		return 0;
	}

	const safety = Math.max(0, Math.min(100, integritySafetyScore));
	return Math.round(proposedIntegrityLoss * (safety / 100));
}

export const HULL_DAMAGE_WITHOUT_FIELD_REPAIR = {
	conditionLoss: 15,
	integrityLoss: 3
} as const;

/**
 * Spend a crafted kit during a run — restores Condition partially, capped at Integrity.
 * Does not restore lost Integrity (overhaul deferred).
 */
export function applyFieldRepairWithKit(
	target: ItemDurability,
	kit: Pick<FieldRepairKitScores, 'conditionRestored' | 'integritySafety'>
): FieldRepairOutcome {
	const before = createItemDurability(target);
	const restorePoints = conditionRestoredPointsFromKitScore(kit.conditionRestored);
	const after = applyNormalRepair(before, restorePoints);
	const conditionRestored = after.condition - before.condition;

	return {
		durability: after,
		conditionBefore: before.condition,
		conditionAfter: after.condition,
		integrityBefore: before.integrity,
		integrityAfter: after.integrity,
		conditionRestored,
		explanation:
			`Field Repair restored +${conditionRestored} Condition ` +
			`(kit Condition Restored score ${kit.conditionRestored}); ` +
			`capped at Integrity ${after.integrity}. Not a full heal.`
	};
}

/** Hold/ignore on Hull Damage — severe wear without kit protection. */
export function applyHullDamageWithoutFieldRepair(target: ItemDurability): ItemDurability {
	return applySevereEvent(target, HULL_DAMAGE_WITHOUT_FIELD_REPAIR);
}

/**
 * Matching Field Repair during Hull Damage — window pressure still lands, but
 * Integrity Safety reduces Integrity loss before the kit restores Condition.
 */
export function applyHullDamageFieldRepair(
	target: ItemDurability,
	kit: Pick<FieldRepairKitScores, 'conditionRestored' | 'integritySafety'>
): FieldRepairOutcome {
	const mitigatedIntegrityLoss = Math.max(
		0,
		HULL_DAMAGE_WITHOUT_FIELD_REPAIR.integrityLoss -
			integrityLossMitigatedFromSafetyScore(
				HULL_DAMAGE_WITHOUT_FIELD_REPAIR.integrityLoss,
				kit.integritySafety
			)
	);

	const afterDamage = applySevereEvent(target, {
		conditionLoss: HULL_DAMAGE_WITHOUT_FIELD_REPAIR.conditionLoss,
		integrityLoss: mitigatedIntegrityLoss
	});

	const repair = applyFieldRepairWithKit(afterDamage, kit);

	return {
		...repair,
		explanation:
			`${repair.explanation} Integrity Safety score ${kit.integritySafety} ` +
			`mitigated structural risk during pressured field repair.`
	};
}
