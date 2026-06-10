import { describe, expect, it } from 'vitest';
import { FIELD_REPAIR_REQUIRES_KIT_REASON } from './getEventWindowResponseOptions.js';
import { validateEventWindowResponse } from './validateEventWindowResponse.js';

describe('validateEventWindowResponse', () => {
	it('rejects field_repair on Hull Damage without a kit', () => {
		const result = validateEventWindowResponse({
			complication: 'hull_damage',
			matchingAction: 'field_repair',
			chosenResponse: 'field_repair',
			fieldRepairKitCount: 0
		});

		expect(result).toEqual({
			ok: false,
			reason: FIELD_REPAIR_REQUIRES_KIT_REASON
		});
	});

	it('allows hold when Field Repair is disabled', () => {
		const result = validateEventWindowResponse({
			complication: 'hull_damage',
			matchingAction: 'field_repair',
			chosenResponse: 'hold',
			fieldRepairKitCount: 0
		});

		expect(result).toEqual({ ok: true });
	});

	it('allows field_repair when a kit is owned', () => {
		const result = validateEventWindowResponse({
			complication: 'hull_damage',
			matchingAction: 'field_repair',
			chosenResponse: 'field_repair',
			fieldRepairKitCount: 1
		});

		expect(result).toEqual({ ok: true });
	});
});
