import { expect, test } from '@playwright/test';

test.describe('first-session browser smoke', () => {
	test('settlement console nav highlights next action', async ({ page }) => {
		await page.goto('/field');
		const nav = page.getByRole('navigation', { name: 'Settlement console' });
		await expect(nav).toBeVisible();
		await expect(nav.getByRole('link')).toHaveCount(4);
		await expect(page.locator('.slice-nav__link--next')).toHaveCount(1);
	});

	test('FIELD, WORKSHOP, and RIG render without horizontal page overflow', async ({ page }) => {
		for (const path of ['/field', '/workshop', '/rig']) {
			await page.goto(path);
			const overflow = await page.evaluate(() => {
				return document.documentElement.scrollWidth > document.documentElement.clientWidth;
			});
			expect(overflow, `${path} should not scroll horizontally`).toBe(false);
		}
	});

	test('workshop ASCII blocks stay within viewport width', async ({ page }) => {
		await page.goto('/workshop?station=fabricator');
		const asciiBlocks = page.locator('pre.thumper-ascii, pre.fabricator-art');
		await expect(asciiBlocks.first()).toBeVisible({ timeout: 10_000 });
		const count = await asciiBlocks.count();
		for (let index = 0; index < count; index += 1) {
			const block = asciiBlocks.nth(index);
			const fits = await block.evaluate((node) => node.scrollWidth <= node.clientWidth + 1);
			expect(fits).toBe(true);
		}
	});

	test('rig page loads equipment panels for a fresh pilot', async ({ page }) => {
		await page.goto('/rig');
		await expect(page.getByText('RIG — Thumper chassis')).toBeVisible();
		await expect(page.getByText(/MAX RUN/i)).toBeVisible();
	});
});
