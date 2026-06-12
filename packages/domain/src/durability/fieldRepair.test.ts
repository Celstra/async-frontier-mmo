import { describe, expect, it } from 'vitest';
import {
	applyFieldRepairWithKit,
	applyHullDamageFieldRepair,
	applyHullDamageWithoutFieldRepair,
	canRestoreConditionWithFieldRepair,
	conditionRestoredPointsFromKitScore
} from './fieldRepair.js';
import { getMaxCondition } from './itemDurability.js';

describe('field repair with kit', () => {
	it('restores Condition partially from kit score — not a full heal', () => {
		const outcome = applyFieldRepairWithKit(
			{ condition: 40, integrity: 100 },
			{ conditionRestored: 80, integritySafety: 70 }
		);

		expect(outcome.conditionRestored).toBeGreaterThan(0);
		expect(outcome.conditionAfter).toBeLessThan(100);
		expect(outcome.integrityAfter).toBe(100);
	});

	it('is not repairable when Condition already equals Integrity', () => {
		expect(canRestoreConditionWithFieldRepair({ condition: 5, integrity: 5 })).toBe(false);
		expect(canRestoreConditionWithFieldRepair({ condition: 70, integrity: 70 })).toBe(false);
	});

	it('is repairable only when Condition is below Integrity', () => {
		expect(canRestoreConditionWithFieldRepair({ condition: 50, integrity: 70 })).toBe(true);
	});

	it('cannot exceed Integrity-limited maximum', () => {
		const outcome = applyFieldRepairWithKit(
			{ condition: 60, integrity: 80 },
			{ conditionRestored: 100, integritySafety: 60 }
		);

		expect(outcome.conditionAfter).toBe(80);
		expect(outcome.conditionAfter).toBe(getMaxCondition({ condition: 60, integrity: 80 }));
	});

	it('scales restore amount with Condition Restored score', () => {
		const lowKit = conditionRestoredPointsFromKitScore(40);
		const highKit = conditionRestoredPointsFromKitScore(90);

		expect(highKit).toBeGreaterThan(lowKit);
		expect(lowKit).toBeGreaterThanOrEqual(12);
		expect(highKit).toBeLessThanOrEqual(28);
	});

	it('hold on hull damage applies severe wear without kit', () => {
		const after = applyHullDamageWithoutFieldRepair({ condition: 90, integrity: 100 });

		expect(after).toEqual({ condition: 75, integrity: 97 });
	});

	it('field repair under hull pressure restores and mitigates Integrity loss', () => {
		const outcome = applyHullDamageFieldRepair(
			{ condition: 90, integrity: 100 },
			{ conditionRestored: 85, integritySafety: 90 }
		);

		expect(outcome.conditionAfter).toBeGreaterThan(75);
		expect(outcome.integrityAfter).toBe(100);
	});
});
