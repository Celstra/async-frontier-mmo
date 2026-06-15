import { expect, test } from '@playwright/test';
import {
	acknowledgeRecallAndPatchHull,
	assembleRigOnWorkshop,
	chooseFirstAsyncDuration,
	claimThumperOnRig,
	completeTutorialFabricatorHandoff,
	deployTutorialTrainingRun
} from './helpers/fieldFlow';
import { newSmokePilotId, seedPilotCookie } from './helpers/pilotContext';
import { fastForwardOpenRunToClaimable, resetKethIronDepositSpotsForSmoke } from './helpers/smokeDb';

test.describe.configure({ mode: 'serial' });
test.setTimeout(420_000);

test.beforeAll(async () => {
	if (!process.env.DATABASE_URL) {
		throw new Error(
			'DATABASE_URL is required for first-session path smoke (see docs/testing/browser-smoke-setup.md)'
		);
	}
	await resetKethIronDepositSpotsForSmoke();
});

test.describe('first-session path smoke', () => {
	test('briefing through hull reserve gate', async ({ page, context, baseURL }) => {
		const pilotId = newSmokePilotId();
		await seedPilotCookie(context, pilotId, baseURL);

		await page.goto('/settlement');
		await expect(page.getByRole('dialog', { name: /Incoming brief/i })).toBeVisible();
		await page.getByRole('button', { name: /Continue/i }).click();
		await expect(page.locator('.slice-nav__link--next')).toBeVisible({ timeout: 10_000 });

		await completeTutorialFabricatorHandoff(page);
		await assembleRigOnWorkshop(page);

		await deployTutorialTrainingRun(page, /2 min \(training\)/i);
		await fastForwardOpenRunToClaimable(pilotId);
		await claimThumperOnRig(page);

		await acknowledgeRecallAndPatchHull(page);

		await deployTutorialTrainingRun(page, /5 min \(training\)/i);
		await fastForwardOpenRunToClaimable(pilotId);
		await claimThumperOnRig(page);

		await chooseFirstAsyncDuration(page);
		await expect(page.locator('.reserve-notice')).toContainText(/Hull plate first/i, {
			timeout: 20_000
		});
	});
});
