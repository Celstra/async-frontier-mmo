import { expect, type Page } from '@playwright/test';

const SCANNER_SLOT_STACKS = [
	{ slotId: 'conductive_core', heading: 'Conductive Core', slug: 'veyrith_copper' },
	{ slotId: 'crystal_lens', heading: 'Crystal Lens', slug: 'pale_ember_crystal' },
	{ slotId: 'frame_mount', heading: 'Frame Mount', slug: 'keth_iron' }
] as const;

async function waitForWorkbenchReady(page: Page): Promise<void> {
	await page.waitForLoadState('networkidle');
	await expect(page.locator('.workshop-bench[data-workshop-ready]')).toBeVisible({
		timeout: 15_000
	});
	await expect(page.locator('.workshop-bench .slot-selector').first()).toBeVisible({
		timeout: 15_000
	});
}

async function selectStackForSlot(
	page: Page,
	slotId: string,
	slotHeading: string,
	resourceSlug: string
): Promise<void> {
	const slot = page.locator('.slot-selector').filter({
		has: page.getByRole('heading', { name: slotHeading, exact: true })
	});
	await expect(slot).toBeVisible({ timeout: 10_000 });

	const card = slot.locator(`[data-testid="workshop-stack-${slotId}-${resourceSlug}"]`);
	await expect(card).toBeEnabled({ timeout: 10_000 });
	await card.click();
	await expect(card).toHaveAttribute('aria-pressed', 'true');
	await expect(page.locator(`input[name="slot_${slotId}"]`)).not.toHaveValue('');
}

export async function fillScannerCraftBench(page: Page): Promise<void> {
	await waitForWorkbenchReady(page);

	for (const row of SCANNER_SLOT_STACKS) {
		await selectStackForSlot(page, row.slotId, row.heading, row.slug);
	}

	await page.getByRole('button', { name: /Increase Survey Clarity tuning/i }).click();
	await page.getByRole('button', { name: /Increase Survey Clarity tuning/i }).click();
	await page.getByRole('button', { name: /Increase Stat Hint Accuracy tuning/i }).click();

	await expect(page.locator('.points-indicator.complete')).toBeVisible({ timeout: 5_000 });

	const submit = page.getByRole('button', { name: /Craft Survey Scanner Module Mk I/i });
	await expect(submit).toBeEnabled({ timeout: 10_000 });
}

export async function craftScannerWithExperiment(page: Page): Promise<void> {
	await page.getByRole('button', { name: /experiment \(2 pulses\)/i }).click();
	const submit = page.getByRole('button', { name: /Craft Survey Scanner Module Mk I/i });
	await expect(submit).toBeEnabled({ timeout: 10_000 });
	await submit.click();
	await page.waitForLoadState('networkidle');
}

export async function expectCraftResultReveal(page: Page): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await expect(reveal.getByText('Fabricator sealed')).toBeVisible({ timeout: 15_000 });
	await expect(reveal.getByText('Prototype complete')).toBeVisible();
	await expect(reveal.locator('.craft-reveal__made-from')).toContainText('Veyrith Copper');
	await expect(reveal.getByText('Pulse 1')).toBeVisible();
	await expect(reveal.getByText('Pulse 2')).toBeVisible();
	await expect(reveal.getByRole('button', { name: 'Compare for RIG' })).toBeVisible();
	await expect(page.getByText(/item crafted — equip it/i)).toHaveCount(0);
}
