import type { ItemDurability, SevereDurabilityEvent } from './types.js';

function clampDurability(state: ItemDurability): ItemDurability {
	const integrity = Math.max(0, state.integrity);
	const condition = Math.min(Math.max(0, state.condition), integrity);

	return { condition, integrity };
}

/** Fresh or loaded item — enforces condition ≤ integrity and non-negative values. */
export function createItemDurability(input: ItemDurability): ItemDurability {
	return clampDurability(input);
}

/** Maximum condition normal repair can reach for this item. */
export function getMaxCondition(state: ItemDurability): number {
	return createItemDurability(state).integrity;
}

/** True when condition is 0 — item is disabled/inefficient, not deleted. */
export function isItemDisabled(state: ItemDurability): boolean {
	return createItemDurability(state).condition === 0;
}

/**
 * Routine meaningful use (survey, thump, craft action) — Condition only.
 * Integrity is unchanged so normal wear stays repairable and predictable.
 */
export function applyRoutineUse(
	state: ItemDurability,
	conditionLoss: number
): ItemDurability {
	const normalized = createItemDurability(state);

	return clampDurability({
		condition: normalized.condition - Math.max(0, conditionLoss),
		integrity: normalized.integrity
	});
}

/**
 * Severe events and risky choices may reduce Integrity (max condition).
 * Condition loss always applies; Integrity loss is explicit and optional.
 */
export function applySevereEvent(
	state: ItemDurability,
	event: SevereDurabilityEvent
): ItemDurability {
	const normalized = createItemDurability(state);
	const integrityLoss = Math.max(0, event.integrityLoss ?? 0);

	return clampDurability({
		condition: normalized.condition - Math.max(0, event.conditionLoss),
		integrity: normalized.integrity - integrityLoss
	});
}

/**
 * Normal repair restores Condition up to the Integrity cap — never above it.
 * Does not restore lost Integrity (overhaul is a later lesson).
 */
export function applyNormalRepair(
	state: ItemDurability,
	conditionRestored: number
): ItemDurability {
	const normalized = createItemDurability(state);
	const cap = normalized.integrity;

	return clampDurability({
		condition: Math.min(cap, normalized.condition + Math.max(0, conditionRestored)),
		integrity: cap
	});
}
