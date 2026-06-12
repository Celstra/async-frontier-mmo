import { describe, expect, it } from 'vitest';
import { isThumperRunClaimable, isThumperRunReadyToResolve } from './isThumperRunClaimable.js';

const deployedAt = new Date('2026-01-01T12:00:00.000Z');
const durationSeconds = 60;

describe('isThumperRunReadyToResolve', () => {
	it('treats zero windows as ready', () => {
		expect(isThumperRunReadyToResolve([])).toBe(true);
	});

	it('requires all windows answered when not recalled', () => {
		expect(
			isThumperRunReadyToResolve([
				{ chosenResponse: 'signal_tune' },
				{ chosenResponse: null }
			])
		).toBe(false);
		expect(
			isThumperRunReadyToResolve([
				{ chosenResponse: 'signal_tune' },
				{ chosenResponse: 'clear_pump_problem' }
			])
		).toBe(true);
	});

	it('is ready after recall early', () => {
		expect(
			isThumperRunReadyToResolve([
				{ chosenResponse: 'signal_tune' },
				{ chosenResponse: 'recall_early' }
			])
		).toBe(true);
	});
});

describe('isThumperRunClaimable', () => {
	it('is not claimable while the timer is active', () => {
		expect(
			isThumperRunClaimable({
				run: { deployedAt, durationSeconds },
				windows: [
					{ chosenResponse: 'signal_tune' },
					{ chosenResponse: 'clear_pump_problem' }
				],
				now: new Date('2026-01-01T12:00:30.000Z')
			})
		).toBe(false);
	});

	it('is claimable when the timer has elapsed and windows are answered', () => {
		expect(
			isThumperRunClaimable({
				run: { deployedAt, durationSeconds },
				windows: [
					{ chosenResponse: 'signal_tune' },
					{ chosenResponse: 'clear_pump_problem' }
				],
				now: new Date('2026-01-01T13:00:00.000Z')
			})
		).toBe(true);
	});

	it('is not claimable when the timer elapsed but windows are unanswered', () => {
		expect(
			isThumperRunClaimable({
				run: { deployedAt, durationSeconds },
				windows: [
					{ chosenResponse: 'signal_tune' },
					{ chosenResponse: null }
				],
				now: new Date('2026-01-01T13:00:00.000Z')
			})
		).toBe(false);
	});

	it('is claimable immediately after recall early', () => {
		expect(
			isThumperRunClaimable({
				run: { deployedAt, durationSeconds },
				windows: [
					{ chosenResponse: 'signal_tune' },
					{ chosenResponse: 'recall_early' }
				],
				now: new Date('2026-01-01T12:00:05.000Z')
			})
		).toBe(true);
	});

	it('is claimable at hull fail-safe time even when later windows are unanswered', () => {
		const longRunSeconds = 3_600;
		expect(
			isThumperRunClaimable({
				run: { deployedAt, durationSeconds: longRunSeconds, runHullIntegrity: 5 },
				windows: [{ chosenResponse: 'signal_tune' }, { chosenResponse: null }],
				now: new Date('2026-01-01T12:03:00.000Z')
			})
		).toBe(true);
		expect(
			isThumperRunClaimable({
				run: { deployedAt, durationSeconds: longRunSeconds, runHullIntegrity: 5 },
				windows: [{ chosenResponse: 'signal_tune' }, { chosenResponse: null }],
				now: new Date('2026-01-01T12:01:00.000Z')
			})
		).toBe(false);
	});
});
