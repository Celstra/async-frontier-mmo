import { describe, expect, it } from 'vitest';
import { buildThumperClaimResultExplanation } from './buildThumperClaimResultExplanation.js';

describe('buildThumperClaimResultExplanation', () => {
	it('chains tutorial windows to recovered quantity', () => {
		const explanation = buildThumperClaimResultExplanation({
			targetResourceDisplayName: 'Veyrith Copper',
			projectedRecovery: 60,
			recoveredQuantity: 60,
			wasteQuantity: 0,
			forfeitedRecovery: 0,
			resolutionType: 'completed',
			explanation: 'signal_drift: used signal_tune',
			eventWindows: [
				{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
			],
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'clear_pump_problem' }
			],
			pilotFrame: 'recon',
			partSnapshots: [
				{
					slot: 'drill',
					itemId: 'drill-1',
					schematicId: 'basic_drill_head',
					displayName: 'Worn Basic Drill',
					propertyScores: {},
					condition: 80,
					integrity: 100
				},
				{
					slot: 'pump',
					itemId: 'pump-1',
					schematicId: 'efficient_pump',
					displayName: 'Worn Basic Pump',
					propertyScores: {},
					condition: 80,
					integrity: 100
				},
				{
					slot: 'hull',
					itemId: 'hull-1',
					schematicId: 'reinforced_hull_plate',
					displayName: 'Worn Basic Hull',
					propertyScores: {},
					condition: 80,
					integrity: 100
				}
			],
			isPushRun: false
		});

		expect(explanation.windowLines).toHaveLength(2);
		expect(explanation.windowLines[0]?.complicationLabel).toBe('Signal Drift');
		expect(explanation.windowLines[0]?.wasteFromWindow).toBe(0);
		expect(explanation.recoveredQuantity).toBe(60);
		expect(explanation.wearLines).toHaveLength(3);
		expect(explanation.summary).toContain('Veyrith Copper');
	});

	it('shows hold waste on a window line', () => {
		const explanation = buildThumperClaimResultExplanation({
			targetResourceDisplayName: 'Veyrith Copper',
			projectedRecovery: 60,
			recoveredQuantity: 45,
			wasteQuantity: 15,
			forfeitedRecovery: 0,
			resolutionType: 'completed',
			explanation: 'pump_strain: held/ignored',
			eventWindows: [
				{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
			],
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			],
			pilotFrame: 'engineer',
			partSnapshots: [],
			isPushRun: false
		});

		expect(explanation.windowLines[1]?.wasteFromWindow).toBe(15);
		expect(explanation.windowLines[1]?.consequence).toContain('held/ignored');
		expect(explanation.salvageNote).toContain('waste/scrap');
	});
});
