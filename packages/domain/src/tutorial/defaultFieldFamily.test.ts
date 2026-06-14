import { describe, expect, it } from 'vitest';
import {
	foremanFirstOrderLine,
	tutorialFieldFamilyDefault
} from './defaultFieldFamily.js';

describe('tutorialFieldFamilyDefault', () => {
	it('uses pinned order family when session has no selection', () => {
		expect(
			tutorialFieldFamilyDefault({
				tutorialStep: 'first_orders',
				pinnedOrder: { family: 'structural_alloy' },
				sessionFamily: null,
				fallback: 'conductive_metal'
			})
		).toBe('structural_alloy');
	});

	it('prefers pinned order family during tutorial hand-fill even when session is set', () => {
		expect(
			tutorialFieldFamilyDefault({
				tutorialStep: 'hunting',
				pinnedOrder: { family: 'conductive_metal' },
				sessionFamily: 'structural_alloy',
				fallback: 'conductive_metal'
			})
		).toBe('conductive_metal');
	});

	it('prefers session family when set', () => {
		expect(
			tutorialFieldFamilyDefault({
				tutorialStep: 'async_reveal',
				pinnedOrder: { family: 'conductive_metal' },
				sessionFamily: 'reactive_crystal',
				fallback: 'conductive_metal'
			})
		).toBe('reactive_crystal');
	});
});

describe('foremanFirstOrderLine', () => {
	it('names the pinned family and FIELD resource', () => {
		expect(
			foremanFirstOrderLine({ pinnedOrder: { family: 'structural_alloy' } })
		).toContain('Keth Iron');
		expect(
			foremanFirstOrderLine({ pinnedOrder: { family: 'structural_alloy' } })
		).toContain('FIELD');
	});
});
