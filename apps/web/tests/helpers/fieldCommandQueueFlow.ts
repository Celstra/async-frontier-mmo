import { expect, type Page } from '@playwright/test';

export async function expectFieldCommandQueuePanel(page: Page): Promise<void> {
	await expect(page.getByTestId('field-command-queue')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId('field-command-queue-beat')).toBeVisible();
}

export async function queueFieldCommand(page: Page, command: 'DRILL' | 'BANK' | 'BRACE' | 'VENT'): Promise<void> {
	const button = page
		.getByTestId('field-command-queue-commands')
		.getByRole('button', { name: new RegExp(`^${command}\\b`, 'i') });
	await expect(button).toBeVisible();
	await button.click();
	await page.waitForLoadState('networkidle');
}

export async function advanceFieldCommandQueueBeat(page: Page): Promise<void> {
	const advance = page.getByRole('button', { name: 'Advance beat' });
	await expect(advance).toBeEnabled();
	await advance.click();
	await page.waitForLoadState('networkidle');
}

export async function expectFieldBeatReadout(page: Page): Promise<void> {
	const readout = page.getByTestId('field-command-queue-beat-readout');
	await expect(readout).toBeVisible();
	await expect(readout).toContainText(/DRILL|BANK|BRACE|VENT/);
	await expect(readout).toContainText(/FIELD/);
	await expect(readout).toContainText(/Heat \d+\/\d+/);
}

export async function expectFieldCommandQueueFitsViewport(page: Page): Promise<void> {
	const panel = page.getByTestId('field-command-queue');
	await expect(panel).toBeVisible();
	const panelOverflow = await panel.evaluate((node) => node.scrollWidth > node.clientWidth + 1);
	const pageOverflow = await page.evaluate(
		() => document.documentElement.scrollWidth > window.innerWidth + 1
	);
	expect(panelOverflow).toBe(false);
	expect(pageOverflow).toBe(false);
}
