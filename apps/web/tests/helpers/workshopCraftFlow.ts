import { expect, type Page } from '@playwright/test';

const DRILL_HEAD_SLOT_STACKS = [
	{ slotId: 'cutting_bit', heading: 'Cutting Bit', slug: 'keth_iron' },
	{ slotId: 'conductive_coil', heading: 'Conductive Coil', slug: 'veyrith_copper' },
	{ slotId: 'resonance_crystal', heading: 'Resonance Crystal', slug: 'pale_ember_crystal' }
] as const;

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
}

async function openAssemblySlot(page: Page, slotId: string): Promise<void> {
	const slotButton = page.getByTestId(`assembly-slot-${slotId}`);
	await expect(slotButton).toBeVisible({ timeout: 10_000 });
	await slotButton.click();
	await expect(page.getByTestId('resource-slot-picker')).toBeVisible({ timeout: 10_000 });
	await expect(page.locator('.slot-selector').first()).toBeVisible({ timeout: 10_000 });
}

async function selectStackForSlot(
	page: Page,
	slotId: string,
	slotHeading: string,
	resourceSlug: string
): Promise<void> {
	await openAssemblySlot(page, slotId);

	const slot = page.locator('.slot-selector').filter({
		has: page.getByRole('heading', { name: slotHeading, exact: true })
	});
	await expect(slot).toBeVisible({ timeout: 10_000 });

	const card = slot.locator(`[data-testid="workshop-stack-${slotId}-${resourceSlug}"]`);
	await expect(card).toBeEnabled({ timeout: 10_000 });
	await card.click();
	await expect(page.getByTestId('resource-slot-picker')).toHaveCount(0, { timeout: 10_000 });
	await expect(page.locator(`input[name="slot_${slotId}"]`)).not.toHaveValue('');
	await expect(page.getByTestId(`assembly-slot-${slotId}`)).toHaveAttribute('aria-pressed', 'false');
}

export async function fillDrillHeadCraftBench(page: Page): Promise<void> {
	await waitForWorkbenchReady(page);

	for (const row of DRILL_HEAD_SLOT_STACKS) {
		await selectStackForSlot(page, row.slotId, row.heading, row.slug);
	}

	await page.getByRole('button', { name: /Increase Extraction Rate tuning/i }).click();
	await page.getByRole('button', { name: /Increase Extraction Rate tuning/i }).click();
	await page.getByRole('button', { name: /Increase Depth Access tuning/i }).click();

	await expect(page.locator('.points-indicator.complete')).toBeVisible({ timeout: 5_000 });

	const submit = page.getByRole('button', { name: /Craft Basic Drill Head/i });
	await expect(submit).toBeEnabled({ timeout: 10_000 });
}

export async function craftDrillHeadWithExperiment(page: Page): Promise<void> {
	await page.getByRole('button', { name: /experiment \(2 pulses\)/i }).click();
	const submit = page.getByRole('button', { name: /Craft Basic Drill Head/i });
	await expect(submit).toBeEnabled({ timeout: 10_000 });
	await submit.click();
	await page.waitForLoadState('networkidle');
}

export async function expectWorkshopCraftResultReveal(
	page: Page,
	options: { compareToBest?: boolean } = {}
): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await expect(reveal.getByText('Fabricator sealed')).toBeVisible({ timeout: 15_000 });
	await expect(reveal.getByText('Prototype complete')).toBeVisible();
	await expect(reveal.getByText('Pulse 1')).toBeVisible();
	await expect(reveal.getByText('Pulse 2')).toBeVisible();
	if (options.compareToBest) {
		await expect(reveal.getByRole('button', { name: 'Compare to your best' })).toBeVisible();
	} else {
		await expect(reveal.getByRole('button', { name: 'Compare to your best' })).toHaveCount(0);
	}
	await expect(reveal.getByRole('button', { name: 'Keep prototype' })).toBeVisible();
	await expect(reveal.getByRole('button', { name: 'Reclaim materials' })).toBeVisible();
	await expect(page.getByText(/item crafted — equip it/i)).toHaveCount(0);
}

export async function keepPrototypeFromReveal(page: Page): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await reveal.getByRole('button', { name: 'Keep prototype' }).click();
	await page.waitForLoadState('networkidle');
}

export async function craftAnotherFromReveal(page: Page): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await reveal.getByRole('button', { name: 'Craft another' }).click();
	await expect(reveal).toHaveCount(0, { timeout: 10_000 });
}

const PUMP_SLOT_STACKS = [
	{ slotId: 'intake_manifold', heading: 'Intake Manifold', slug: 'sorrel_vein_copper' },
	{ slotId: 'flexible_housing', heading: 'Flexible Housing', slug: 'keth_iron' },
	{ slotId: 'flow_crystal', heading: 'Flow Crystal', slug: 'pale_ember_crystal' }
] as const;

const HULL_SLOT_STACKS = [
	{ slotId: 'outer_plate', heading: 'Outer Plate', slug: 'keth_iron' },
	{ slotId: 'bracing_layer', heading: 'Bracing Layer', slug: 'asterion_frame_alloy' },
	{ slotId: 'bonding_matrix', heading: 'Bonding Matrix', slug: 'pale_ember_crystal' }
] as const;

export async function fillEfficientPumpCraftBench(page: Page): Promise<void> {
	await waitForWorkbenchReady(page);

	for (const row of PUMP_SLOT_STACKS) {
		await selectStackForSlot(page, row.slotId, row.heading, row.slug);
	}

	await page.getByRole('button', { name: /Increase Recovery Efficiency tuning/i }).click();
	await page.getByRole('button', { name: /Increase Recovery Efficiency tuning/i }).click();
	await page.getByRole('button', { name: /Increase Clog Resistance tuning/i }).click();

	await expect(page.locator('.points-indicator.complete')).toBeVisible({ timeout: 5_000 });
	await expect(page.getByRole('button', { name: /Craft Efficient Pump/i })).toBeEnabled({
		timeout: 10_000
	});
}

export async function craftEfficientPumpSafe(page: Page): Promise<void> {
	const submit = page.getByRole('button', { name: /Craft Efficient Pump/i });
	await submit.click();
	await page.waitForLoadState('networkidle');
}

export async function fillReinforcedHullCraftBench(page: Page): Promise<void> {
	await waitForWorkbenchReady(page);

	for (const row of HULL_SLOT_STACKS) {
		await selectStackForSlot(page, row.slotId, row.heading, row.slug);
	}

	await page.getByRole('button', { name: /Increase Max Condition tuning/i }).click();
	await page.getByRole('button', { name: /Increase Max Condition tuning/i }).click();
	await page.getByRole('button', { name: /Increase Damage Reduction tuning/i }).click();

	await expect(page.locator('.points-indicator.complete')).toBeVisible({ timeout: 5_000 });
	await expect(page.getByRole('button', { name: /Craft Reinforced Hull Plate/i })).toBeEnabled({
		timeout: 10_000
	});
}

export async function craftReinforcedHullSafe(page: Page): Promise<void> {
	const submit = page.getByRole('button', { name: /Craft Reinforced Hull Plate/i });
	await submit.click();
	await page.waitForLoadState('networkidle');
}

export async function favoritePrototypeFromReveal(page: Page): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await reveal.getByRole('button', { name: 'Keep prototype' }).click();
	await page.waitForLoadState('networkidle');
}

export async function expandSupplyDropPanel(page: Page): Promise<void> {
	const panel = page.getByLabel('Workshop supply crates');
	const toggle = panel.getByTestId('supply-drop-banner');
	if ((await toggle.getAttribute('aria-expanded')) === 'false') {
		await toggle.click();
	}
}

export async function openFirstAvailableCrate(page: Page): Promise<void> {
	const panel = page.getByLabel('Workshop supply crates');
	await expandSupplyDropPanel(page);
	await panel.getByRole('button', { name: 'Open crate' }).first().click();
	await page.waitForLoadState('networkidle');
}

export async function reclaimPrototypeFromReveal(page: Page): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await reveal.getByRole('button', { name: 'Reclaim materials' }).click();
	await reveal.getByRole('button', { name: 'Confirm reclaim' }).click();
	await page.waitForLoadState('networkidle');
	await expect(reveal).toHaveCount(0, { timeout: 10_000 });
}

export async function openCompareToBestFromReveal(page: Page): Promise<void> {
	const reveal = page.locator('.craft-reveal');
	await reveal.getByRole('button', { name: 'Compare to your best' }).click();
	await expect(reveal.getByText('Prior best for this schematic')).toBeVisible();
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
