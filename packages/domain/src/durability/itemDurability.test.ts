import { describe, expect, it } from 'vitest';
import {
	applyNormalRepair,
	applyRoutineUse,
	applySevereEvent,
	createItemDurability,
	getMaxCondition,
	isItemDisabled
} from './itemDurability.js';

describe('item durability', () => {
	it('routine use reduces Condition only', () => {
		const fresh = createItemDurability({ condition: 100, integrity: 100 });

		const afterSurvey = applyRoutineUse(fresh, 3);
		const afterThump = applyRoutineUse(afterSurvey, 5);

		expect(afterThump).toEqual({ condition: 92, integrity: 100 });
		expect(getMaxCondition(afterThump)).toBe(100);
	});

	it('severe event may risk Integrity', () => {
		const state = createItemDurability({ condition: 80, integrity: 100 });

		const afterHullDamage = applySevereEvent(state, {
			conditionLoss: 20,
			integrityLoss: 5
		});

		expect(afterHullDamage).toEqual({ condition: 60, integrity: 95 });
		expect(getMaxCondition(afterHullDamage)).toBe(95);
	});

	it('normal repair cannot exceed Integrity-limited maximum', () => {
		const worn = createItemDurability({ condition: 50, integrity: 80 });

		const partial = applyNormalRepair(worn, 10);
		expect(partial).toEqual({ condition: 60, integrity: 80 });

		const overRestore = applyNormalRepair(worn, 50);
		expect(overRestore).toEqual({ condition: 80, integrity: 80 });
		expect(overRestore.condition).toBe(getMaxCondition(worn));
	});

	it('does not delete the item at 0 Condition', () => {
		const nearlyBroken = createItemDurability({ condition: 3, integrity: 100 });

		const broken = applyRoutineUse(nearlyBroken, 10);

		expect(broken).toEqual({ condition: 0, integrity: 100 });
		expect(isItemDisabled(broken)).toBe(true);
	});

	it('clamps Condition when Integrity drops below current Condition', () => {
		const state = createItemDurability({ condition: 90, integrity: 100 });

		const afterSevere = applySevereEvent(state, {
			conditionLoss: 0,
			integrityLoss: 20
		});

		expect(afterSevere).toEqual({ condition: 80, integrity: 80 });
	});
});
