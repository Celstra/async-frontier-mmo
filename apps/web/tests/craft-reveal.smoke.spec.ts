import { expect, test } from '@playwright/test';
import { newSmokePilotId, seedPilotCookie } from './helpers/pilotContext';
import {
	cleanupScannerCraftPilotForSmoke,
	seedScannerCraftPilotForSmoke
} from './helpers/smokeDb';
import {
	craftScannerWithExperiment,
	expectCraftResultReveal,
	fillScannerCraftBench
} from './helpers/workshopCraftFlow';

test.describe('craft result reveal smoke', () => {
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
		await seedScannerCraftPilotForSmoke(pilotId);
		await seedPilotCookie(context, pilotId, baseURL);

		try {
			await page.goto('/workshop?station=fabricator&schematic=survey_scanner_mk_i');
			await expect(page.getByRole('heading', { name: /assemble survey scanner/i })).toBeVisible({
				timeout: 15_000
			});
			await expect(page.getByText("Can't craft yet")).toHaveCount(0);

			await fillScannerCraftBench(page);
			await craftScannerWithExperiment(page);
			await expectCraftResultReveal(page);

			await page.getByRole('button', { name: 'Compare for RIG' }).click();
			await expect(page.getByText('RIG install preview')).toBeVisible();
			await expect(page.getByRole('button', { name: /Install Survey Scanner/i })).toBeVisible();

			await page.getByRole('button', { name: 'Keep current' }).click();
			await expect(page.getByText('RIG install preview')).toHaveCount(0);

			await page.getByRole('button', { name: 'Craft another' }).click();
			await expect(page.getByText('Fabricator sealed')).toHaveCount(0);
			await expect(page.getByRole('heading', { name: /craft mode/i })).toBeVisible();
		} finally {
			await cleanupScannerCraftPilotForSmoke(pilotId);
		}
	});
});
