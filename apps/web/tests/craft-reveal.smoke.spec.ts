import { expect, test } from '@playwright/test';
import { newSmokePilotId, seedPilotCookie } from './helpers/pilotContext';
import {
	cleanupWorkshopCraftPilotForSmoke,
	seedWorkshopCraftPilotForSmoke
} from './helpers/smokeDb';
import {
	craftAnotherFromReveal,
	craftDrillHeadSafe,
	craftDrillHeadWithExperiment,
	expectWorkshopCraftResultReveal,
	fillDrillHeadCraftBench,
	openCompareToBestFromReveal,
	tryExperimentNextFromReveal
} from './helpers/workshopCraftFlow';

test.describe('craft result reveal smoke', () => {
	test.setTimeout(90_000);

	test.beforeAll(() => {
		if (!process.env.DATABASE_URL) {
			throw new Error(
				'DATABASE_URL is required for craft reveal smoke (see docs/testing/browser-smoke-setup.md)'
			);
		}
	});

	test('experiment craft shows frozen reveal, compare path, and craft another dismisses it', async ({
		page,
		context,
		baseURL
	}) => {
		const pilotId = newSmokePilotId();
		await seedWorkshopCraftPilotForSmoke(pilotId);
		await seedPilotCookie(context, pilotId, baseURL);

		try {
			await page.goto('/workshop?station=fabricator&schematic=basic_drill_head');
			await expect(page.locator('.workshop-bench[data-workshop-ready="true"]')).toBeVisible({
				timeout: 15_000
			});
			await expect(page.getByText("Can't craft yet")).toHaveCount(0);

			await fillDrillHeadCraftBench(page);
			await craftDrillHeadWithExperiment(page);
			await expectWorkshopCraftResultReveal(page);
			await craftAnotherFromReveal(page);

			await fillDrillHeadCraftBench(page);
			await craftDrillHeadWithExperiment(page);
			await expectWorkshopCraftResultReveal(page, { hasComparison: true });
			await expect(page.locator('.craft-reveal').getByTestId('craft-compare-btn')).toBeVisible();

			await openCompareToBestFromReveal(page);
			await expect(page.getByRole('button', { name: /Install /i })).toHaveCount(0);
			await page.getByRole('button', { name: 'Close comparison' }).click();

			await craftAnotherFromReveal(page);
			await expect(page.getByText('Fabricator sealed')).toHaveCount(0);
			await expect(page.getByRole('button', { name: /Experiment \(2 pulses\)/i })).toBeVisible();

			await fillDrillHeadCraftBench(page);
			await craftDrillHeadSafe(page);
			await expectWorkshopCraftResultReveal(page, { safeCraft: true });
			await tryExperimentNextFromReveal(page);
		} finally {
			await cleanupWorkshopCraftPilotForSmoke(pilotId);
		}
	});

});
