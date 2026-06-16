import { expect, test } from '@playwright/test';
import { newSmokePilotId, seedPilotCookie } from './helpers/pilotContext';
import {
	cleanupWorkshopCraftPilotForSmoke,
	mintWorkshopTimerCrateForSmoke,
	seedWorkshopCraftPilotForSmoke
} from './helpers/smokeDb';
import {
	craftAnotherFromReveal,
	craftDrillHeadWithExperiment,
	craftEfficientPumpSafe,
	craftReinforcedHullSafe,
	expectWorkshopCraftResultReveal,
	favoritePrototypeFromReveal,
	fillDrillHeadCraftBench,
	fillEfficientPumpCraftBench,
	fillReinforcedHullCraftBench,
	openFirstAvailableCrate,
	reclaimPrototypeFromReveal
} from './helpers/workshopCraftFlow';

test.describe('workshop slice acceptance path', () => {
	test.beforeAll(() => {
		if (!process.env.DATABASE_URL) {
			throw new Error(
				'DATABASE_URL is required for workshop acceptance path smoke (see docs/testing/browser-smoke-setup.md)'
			);
		}
	});

	test('fresh pilot completes the Decision 024 workshop loop', async ({ page, context, baseURL }) => {
		const pilotId = newSmokePilotId();
		await seedWorkshopCraftPilotForSmoke(pilotId);
		await seedPilotCookie(context, pilotId, baseURL);

		try {
			await page.goto('/workshop');
			await expect(page.getByText('WORKSHOP — Fabricator bay')).toBeVisible();
			await expect(page.getByRole('navigation', { name: 'Workshop schematics' }).getByRole('link')).toHaveCount(
				3
			);

			await page.goto('/workshop?schematic=basic_drill_head');
			await expect(page.getByText('Keth Iron')).toBeVisible({ timeout: 10_000 });
			await fillDrillHeadCraftBench(page);
			await craftDrillHeadWithExperiment(page);
			await expectWorkshopCraftResultReveal(page);
			await expect(page.locator('.craft-reveal__made-from')).toBeVisible();
			await favoritePrototypeFromReveal(page);
			await expect(page.locator('.craft-history__kept')).toBeVisible();

			await page.goto('/workshop?schematic=efficient_pump');
			await fillEfficientPumpCraftBench(page);
			await craftEfficientPumpSafe(page);
			await expect(page.locator('.craft-reveal')).toBeVisible({ timeout: 15_000 });
			await craftAnotherFromReveal(page);

			await page.goto('/workshop?schematic=reinforced_hull_plate');
			await fillReinforcedHullCraftBench(page);
			await craftReinforcedHullSafe(page);
			await expect(page.locator('.craft-reveal')).toBeVisible({ timeout: 15_000 });
			await expect(page.locator('.craft-history__item')).toHaveCount(1);
			await reclaimPrototypeFromReveal(page);
			await expect(page.locator('.craft-history__item')).toHaveCount(0);

			await page.goto('/workshop?schematic=basic_drill_head');
			await expect(page.locator('.craft-history__kept')).toBeVisible();

			await mintWorkshopTimerCrateForSmoke(pilotId);
			await page.goto('/workshop');
			await openFirstAvailableCrate(page);
			await expect(page.getByLabel('Workshop supply crates').getByText('No crates ready to open')).toBeVisible({
				timeout: 10_000
			});

			await page.reload();
			await page.goto('/workshop?schematic=basic_drill_head');
			await expect(page.locator('.craft-history__kept')).toBeVisible({ timeout: 10_000 });
			await expect(page.getByLabel('Workshop supply crates').getByText('Next timed crate')).toBeVisible();

			for (const path of ['/field', '/rig', '/settlement']) {
				await page.goto(path);
				await expect(page.getByText('In development', { exact: true })).toBeVisible();
			}
		} finally {
			await cleanupWorkshopCraftPilotForSmoke(pilotId);
		}
	});
});
