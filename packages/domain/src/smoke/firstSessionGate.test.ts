import { describe, expect, it } from 'vitest';
import { resolveNextActionScreen } from '../tutorial/resolveNextActionScreen.js';
import { shouldBindSampleToOrders } from '../settlement/shouldBindSampleToOrders.js';
import { validateTutorialDeployTarget } from '../thumper/tutorialDeploy.js';
import { availableTails } from '../thumper/hullRunCeiling.js';
import { totalRunDurationSeconds } from '../thumper/deployPreview.js';
import { PATCHED_HULL_INTEGRITY } from '../tuning.js';

/** Browser smoke gate — domain first-session invariants (round-4 no-deferral). */
describe('firstSessionGate smoke', () => {
	it('highlights FIELD after briefing and RIG during open run', () => {
		expect(
			resolveNextActionScreen({
				tutorialStep: 'first_orders',
				orderReadyToTurnIn: false,
				openRunActive: false,
				claimPendingOnRig: false,
				settlementBriefingPending: false
			})
		).toBe('field');

		expect(
			resolveNextActionScreen({
				tutorialStep: 'async_reveal',
				orderReadyToTurnIn: false,
				openRunActive: true,
				claimPendingOnRig: false,
				settlementBriefingPending: false
			})
		).toBe('rig');
	});

	it('binds tutorial free samples and locks Keth deploy', () => {
		expect(
			shouldBindSampleToOrders({
				energyCost: 0,
				tutorialStep: 'first_orders',
				pinnedOrderFamily: 'structural_alloy',
				sampledResourceSlug: 'keth_iron'
			})
		).toBe(true);

		expect(
			validateTutorialDeployTarget({
				tutorialStep: 'first_deploy',
				resourceSlug: 'sorrel_vein_copper',
				resourceInstanceId: 'x',
				spotId: 'y',
				lockedTarget: {
					resourceInstanceId: 'keth',
					depositSpotId: 'spot',
					resourceSlug: 'keth_iron'
				}
			}).allowed
		).toBe(false);
	});

	it('uses tail-only durations and emergency patched tail', () => {
		expect(totalRunDurationSeconds(60, 15)).toBe(900);
		expect(
			availableTails('patched', PATCHED_HULL_INTEGRITY, { allowFirstHullEmergencyRun: true }).some(
				(tail) => tail.minutes === 5
			)
		).toBe(true);
	});
});
