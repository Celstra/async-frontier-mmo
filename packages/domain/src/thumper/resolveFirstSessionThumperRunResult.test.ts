import { describe, expect, it } from 'vitest';
import {
	FIRST_SESSION_SCANNER_MINIMUM,
	resolveFirstSessionThumperRunResult
} from './resolveFirstSessionThumperRunResult.js';

const perfectResponses = [
	{ windowIndex: 1, complication: 'signal_drift' as const, chosenResponse: 'signal_tune' as const },
	{
		windowIndex: 2,
		complication: 'pump_strain' as const,
		chosenResponse: 'clear_pump_problem' as const
	}
];

describe('resolveFirstSessionThumperRunResult', () => {
	it('matching actions on both windows yield full recovery with no waste', () => {
		const result = resolveFirstSessionThumperRunResult({
			targetResourceId: 'veyrith_copper',
			responses: perfectResponses,
			pilotFrame: 'recon'
		});

		expect(result.targetResourceId).toBe('veyrith_copper');
		expect(result.projectedRecovery).toBe(113);
		expect(result.recoveredQuantity).toBe(118);
		expect(result.wasteQuantity).toBe(0);
		expect(result.explanation).toContain('signal_tune');
		expect(result.explanation).toContain('clear_pump_problem');
	});

	it('hold on Pump Strain adds waste without changing the named resource id', () => {
		const result = resolveFirstSessionThumperRunResult({
			targetResourceId: 'veyrith_copper',
			pilotFrame: 'recon',
			responses: [
				perfectResponses[0],
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			]
		});

		expect(result.targetResourceId).toBe('veyrith_copper');
		expect(result.wasteQuantity).toBeGreaterThan(0);
		expect(result.recoveredQuantity).toBeLessThan(118);
		expect(result).not.toHaveProperty('stats');
	});

	it('double-hold still recovers enough Veyrith for scanner conductive_core', () => {
		const result = resolveFirstSessionThumperRunResult({
			targetResourceId: 'veyrith_copper',
			pilotFrame: 'recon',
			responses: [
				{ windowIndex: 1, complication: 'signal_drift', chosenResponse: 'hold' },
				{ windowIndex: 2, complication: 'pump_strain', chosenResponse: 'hold' }
			]
		});

		expect(result.recoveredQuantity).toBeGreaterThanOrEqual(FIRST_SESSION_SCANNER_MINIMUM);
	});
});
