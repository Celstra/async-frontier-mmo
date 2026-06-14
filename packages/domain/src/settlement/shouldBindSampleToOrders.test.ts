import { describe, expect, it } from 'vitest';
import { shouldBindSampleToOrders } from './shouldBindSampleToOrders.js';

describe('shouldBindSampleToOrders', () => {
	it('binds paid samples regardless of tutorial step', () => {
		expect(
			shouldBindSampleToOrders({
				energyCost: 12,
				tutorialStep: 'done',
				pinnedOrderFamily: 'conductive_metal',
				sampledResourceSlug: 'sorrel_vein_copper'
			})
		).toBe(true);
	});

	it('binds free Keth sample during first structural order', () => {
		expect(
			shouldBindSampleToOrders({
				energyCost: 0,
				tutorialStep: 'first_orders',
				pinnedOrderFamily: 'structural_alloy',
				sampledResourceSlug: 'keth_iron'
			})
		).toBe(true);
	});

	it('does not bind free sample for wrong resource', () => {
		expect(
			shouldBindSampleToOrders({
				energyCost: 0,
				tutorialStep: 'first_orders',
				pinnedOrderFamily: 'structural_alloy',
				sampledResourceSlug: 'sorrel_vein_copper'
			})
		).toBe(false);
	});

	it('does not bind free scout sample after tutorial', () => {
		expect(
			shouldBindSampleToOrders({
				energyCost: 0,
				tutorialStep: 'done',
				pinnedOrderFamily: 'conductive_metal',
				sampledResourceSlug: 'sorrel_vein_copper'
			})
		).toBe(false);
	});
});
