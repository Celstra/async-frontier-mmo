import { expect, test } from '@playwright/test';
import {
	advanceFieldCommandQueueBeat,
	claimFieldCommandQueue,
	expectFieldBeatReadout,
	expectFieldClaimRecoveredAboveZero,
	expectFieldCommandQueueClaimReady,
	expectFieldCommandQueueFitsViewport,
	expectFieldCommandQueuePanel,
	playFieldCommandQueueStarterScript,
	queueFieldCommand
} from './helpers/fieldCommandQueueFlow';
import { newSmokePilotId, seedPilotCookie } from './helpers/pilotContext';
import {
	cleanupCommandQueuePilotForSmoke,
	seedCommandQueuePilotForSmoke
} from './helpers/smokeDb';

test.describe('field command queue smoke', () => {
	test.setTimeout(180_000);

	test.beforeAll(() => {
		if (!process.env.DATABASE_URL) {
			throw new Error(
				'DATABASE_URL is required for field command queue smoke (see docs/testing/browser-smoke-setup.md)'
			);
		}
	});

	test('queues commands, advances with beat readout, and fits viewport', async ({
		page,
		context,
		baseURL
	}) => {
		const pilotId = newSmokePilotId();
		await seedCommandQueuePilotForSmoke(pilotId);
		await seedPilotCookie(context, pilotId, baseURL);

		try {
			await page.goto('/field');
			await expectFieldCommandQueuePanel(page);
			await expect(page.getByTestId('field-command-queue-timing')).toBeVisible();
			await expectFieldCommandQueueFitsViewport(page);

			await queueFieldCommand(page, 'DRILL');
			await queueFieldCommand(page, 'BANK');
			const queueSlots = page.getByTestId('field-command-queue-slots');
			await expect(queueSlots.getByText('NEXT', { exact: true })).toBeVisible();
			await expect(queueSlots.getByText('EDIT', { exact: true })).toBeVisible();

			await advanceFieldCommandQueueBeat(page);
			await expectFieldBeatReadout(page);
			await expectFieldCommandQueueFitsViewport(page);
			await page.setViewportSize({ width: 390, height: 780 });
			await expectFieldCommandQueueFitsViewport(page);
		} finally {
			await cleanupCommandQueuePilotForSmoke(pilotId);
		}
	});

	test('plays starter script to claim with secured yield above zero', async ({
		page,
		context,
		baseURL
	}) => {
		const pilotId = newSmokePilotId();
		await seedCommandQueuePilotForSmoke(pilotId);
		await seedPilotCookie(context, pilotId, baseURL);

		try {
			await page.goto('/field');
			await expectFieldCommandQueuePanel(page);
			await playFieldCommandQueueStarterScript(page);
			await expectFieldCommandQueueClaimReady(page);
			await claimFieldCommandQueue(page);
			await expectFieldClaimRecoveredAboveZero(page);
		} finally {
			await cleanupCommandQueuePilotForSmoke(pilotId);
		}
	});
});
