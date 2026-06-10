import { describe, expect, it } from 'vitest';
import {
	complicationDisplayName,
	frameFlavoredActionLabel,
	eventActionLabel
} from './eventActionLabels.js';

describe('eventActionLabels', () => {
	it('uses frame-flavored copy when the frame specializes on the action', () => {
		expect(frameFlavoredActionLabel('recon', 'signal_tune')).toContain('Signal Tune');
		expect(frameFlavoredActionLabel('engineer', 'clear_pump_problem')).toContain('Clear Pump Problem');
	});

	it('falls back to neutral action labels for non-specialized frames', () => {
		expect(frameFlavoredActionLabel('vanguard', 'signal_tune')).toBe(eventActionLabel('signal_tune'));
	});

	it('maps complication ids to player-facing names', () => {
		expect(complicationDisplayName('signal_drift')).toBe('Signal Drift');
		expect(complicationDisplayName('pump_strain')).toBe('Pump Strain');
	});
});
