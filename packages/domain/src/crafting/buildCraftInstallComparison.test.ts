import { describe, expect, it } from 'vitest';
import { buildCraftInstallComparison } from './buildCraftInstallComparison.js';
import { REINFORCED_HULL_PLATE } from './schematics/reinforcedHullPlate.js';
import { SURVEY_SCANNER_MK_I } from './schematics/surveyScannerMkI.js';

describe('buildCraftInstallComparison', () => {
	it('builds scanner deltas against the equipped module', () => {
		const comparison = buildCraftInstallComparison({
			schematic: SURVEY_SCANNER_MK_I,
			current: {
				itemId: 'old',
				displayName: 'Starter Scanner',
				condition: 80,
				integrity: 90,
				propertyScores: { survey_clarity: 55, stat_hint_accuracy: 50, signal_range: 48 }
			},
			candidate: {
				itemId: 'new',
				displayName: 'Survey Scanner Module Mk I',
				condition: 100,
				integrity: 100,
				propertyScores: { survey_clarity: 91, stat_hint_accuracy: 62, signal_range: 58 }
			}
		});

		expect(comparison?.installKind).toBe('scanner');
		expect(comparison?.lines.some((line) => line.label === 'Survey Clarity')).toBe(true);
		expect(comparison?.lines.find((line) => line.label === 'Survey Clarity')?.after).toContain(
			'91'
		);
	});

	it('builds hull slot preview for reinforced plate', () => {
		const comparison = buildCraftInstallComparison({
			schematic: REINFORCED_HULL_PLATE,
			current: {
				itemId: 'hull-old',
				displayName: 'Scavenged Hull Plate',
				condition: 30,
				integrity: 30,
				propertyScores: { max_condition: 30, damage_reduction: 35, repairability: 30 }
			},
			candidate: {
				itemId: 'hull-new',
				displayName: 'Reinforced Hull Plate',
				condition: 100,
				integrity: 96,
				propertyScores: { max_condition: 96, damage_reduction: 88, repairability: 72 }
			}
		});

		expect(comparison?.installKind).toBe('thumper_part');
		expect(comparison?.thumperSlot).toBe('hull');
		expect(comparison?.slotLabel).toBe('Hull slot');
	});
});
