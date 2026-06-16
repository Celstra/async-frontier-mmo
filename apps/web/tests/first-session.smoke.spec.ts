import { expect, test } from '@playwright/test';
import {
	craftAnotherFromReveal,
	craftDrillHeadWithExperiment,
	expectWorkshopCraftResultReveal,
	fillDrillHeadCraftBench,
	keepPrototypeFromReveal,
	openCompareToBestFromReveal,
	reclaimPrototypeFromReveal
} from './helpers/workshopCraftFlow';

test.describe('workshop-first browser smoke', () => {
	test('root redirects to workshop', async ({ page }) => {
		await page.goto('/');
		await expect(page).toHaveURL(/\/workshop/);
	});

	test('workshop nav highlights workshop as next action', async ({ page }) => {
		await page.goto('/workshop');
		const nav = page.getByRole('navigation', { name: 'Settlement console' });
		await expect(nav).toBeVisible();
		await expect(nav.getByRole('link')).toHaveCount(4);
		const nextLink = page.locator('.slice-nav__link--next');
		await expect(nextLink).toHaveCount(1);
		await expect(nextLink).toHaveText(/\[W\]ORKSHOP/);
	});

	test('field, rig, and settlement show in development placeholders', async ({ page }) => {
		for (const path of ['/field', '/rig', '/settlement']) {
			await page.goto(path);
			await expect(page.getByText('In development', { exact: true })).toBeVisible();
			await expect(page.getByRole('link', { name: 'WORKSHOP' })).toBeVisible();
		}
	});

	test('workshop and in-development screens render without horizontal overflow', async ({ page }) => {
		for (const path of ['/workshop', '/field', '/rig', '/settlement']) {
			await page.goto(path);
			const overflow = await page.evaluate(() => {
				return document.documentElement.scrollWidth > document.documentElement.clientWidth;
			});
			expect(overflow, `${path} should not scroll horizontally`).toBe(false);
		}
	});

	test('workshop ASCII blocks stay within viewport width', async ({ page }) => {
		await page.goto('/workshop');
		const asciiBlocks = page.locator('pre.fabricator-art');
		await expect(asciiBlocks.first()).toBeVisible({ timeout: 10_000 });
		const count = await asciiBlocks.count();
		for (let index = 0; index < count; index += 1) {
			const block = asciiBlocks.nth(index);
			const fits = await block.evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
			expect(fits).toBe(true);
		}
	});

	test('workshop lists only the three thumper-part schematics', async ({ page }) => {
		await page.goto('/workshop');
		const schematicNav = page.getByRole('navigation', { name: 'Workshop schematics' });
		await expect(schematicNav.getByRole('link')).toHaveCount(3);
		await expect(schematicNav.getByRole('link', { name: /Basic Drill Head/i })).toBeVisible();
		await expect(schematicNav.getByRole('link', { name: /Efficient Pump/i })).toBeVisible();
		await expect(schematicNav.getByRole('link', { name: /Reinforced Hull Plate/i })).toBeVisible();
	});

	test('workshop craft bench uses button controls instead of native selects', async ({ page }) => {
		await page.goto('/workshop?schematic=basic_drill_head');
		await expect(page.locator('.workshop-bench[data-workshop-ready="true"]')).toBeVisible({
			timeout: 10_000
		});
		await page.getByRole('button', { name: /Experiment \(2 pulses\)/i }).click();
		await expect(page.locator('select')).toHaveCount(0);
		await expect(page.getByRole('button', { name: /Extraction Rate/i }).first()).toBeVisible();
	});

	test('craft reveal shows keep and reclaim controls without auto-install', async ({ page }) => {
		await page.goto('/workshop?schematic=basic_drill_head');
		await fillDrillHeadCraftBench(page);
		await craftDrillHeadWithExperiment(page);
		await expectWorkshopCraftResultReveal(page);
		await expect(page.locator('.craft-history')).toBeVisible();
		await expect(page.getByText('Last')).toBeVisible();
	});

	test('keep persists after reload', async ({ page }) => {
		await page.goto('/workshop?schematic=basic_drill_head');
		await fillDrillHeadCraftBench(page);
		await craftDrillHeadWithExperiment(page);
		await keepPrototypeFromReveal(page);
		await expect(page.locator('.craft-history__kept')).toBeVisible();

		await page.reload();
		await expect(page.locator('.craft-history__kept')).toBeVisible({ timeout: 10_000 });
	});

	test('second craft enables compare to best without install', async ({ page }) => {
		await page.goto('/workshop?schematic=basic_drill_head');
		await fillDrillHeadCraftBench(page);
		await craftDrillHeadWithExperiment(page);
		await craftAnotherFromReveal(page);
		await fillDrillHeadCraftBench(page);
		await craftDrillHeadWithExperiment(page);
		await expect(page.locator('.craft-reveal').getByRole('button', { name: 'Compare to your best' })).toBeVisible();
		await openCompareToBestFromReveal(page);
		await expect(page.getByRole('button', { name: /Install /i })).toHaveCount(0);
	});

	test('reclaim removes crafted item from history', async ({ page }) => {
		await page.goto('/workshop?schematic=basic_drill_head');
		await fillDrillHeadCraftBench(page);
		await craftDrillHeadWithExperiment(page);
		await expect(page.locator('.craft-history__item')).toHaveCount(1);
		await reclaimPrototypeFromReveal(page);
		await expect(page.locator('.craft-history__item')).toHaveCount(0);
	});

	test('workshop supply panel shows timed crate state across reload', async ({ page }) => {
		await page.goto('/workshop');
		const panel = page.getByLabel('Workshop supply crates');
		await expect(panel).toBeVisible();
		await expect(panel.getByText('Next timed crate')).toBeVisible();
		await expect(panel.getByText(/Every 10 minutes while this workshop tab is active/)).toBeVisible();
		await page.reload();
		await expect(panel.getByText('Next timed crate')).toBeVisible();
	});
});
