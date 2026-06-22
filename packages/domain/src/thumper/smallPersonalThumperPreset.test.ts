import { describe, expect, it } from 'vitest';
import { OLD_RUNDOWN_SMALL_PERSONAL_THUMPER } from './smallPersonalThumperPreset.js';

describe('old run-down small personal thumper preset', () => {
	it('declares the supported starter loadout and small-frame slot limits', () => {
		expect(OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.sizeLabel).toBe('small personal');
		expect(
			OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.supportedComponentSlots.map((slot) => slot.slotId)
		).toEqual(['drill', 'pump', 'hull']);
		expect(
			OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.unsupportedComponentSlots.map((slot) => slot.slotId)
		).toEqual(['hopper', 'coolant']);
		expect(OLD_RUNDOWN_SMALL_PERSONAL_THUMPER.starterParts.map((part) => part.slot)).toEqual([
			'drill',
			'pump',
			'hull'
		]);
	});
});
