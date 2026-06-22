import { expect, type Page } from '@playwright/test';
import {
	COMMAND_QUEUE_RUN_BEATS,
	STARTER_COMMAND_QUEUE_SCRIPT,
	STARTER_QUEUE_LENGTH,
	requiredCommandQueueScriptLength,
	type ThumperCommand
} from '@async-frontier-mmo/domain';

export type FieldCommandButtonLabel = 'DRILL' | 'BANK' | 'BRACE' | 'VENT';

const COMMAND_BUTTON_LABEL: Record<ThumperCommand, FieldCommandButtonLabel> = {
	drill: 'DRILL',
	bank: 'BANK',
	brace: 'BRACE',
	vent: 'VENT'
};

export async function expectFieldCommandQueuePanel(page: Page): Promise<void> {
	await expect(page.getByTestId('field-command-queue')).toBeVisible({ timeout: 15_000 });
	await expect(page.getByTestId('field-command-queue-beat')).toBeVisible();
}

export async function queueFieldCommand(
	page: Page,
	command: FieldCommandButtonLabel
): Promise<void> {
	const button = page
		.getByTestId('field-command-queue-commands')
		.getByRole('button', { name: new RegExp(`^${command}\\b`, 'i') });
	await expect(button).toBeVisible();
	await button.click();
	await page.waitForLoadState('networkidle');
}

export async function queueFieldCommandById(page: Page, command: ThumperCommand): Promise<void> {
	await queueFieldCommand(page, COMMAND_BUTTON_LABEL[command]);
}

export async function advanceFieldCommandQueueBeat(page: Page): Promise<void> {
	const advance = page.getByRole('button', { name: 'Advance beat' });
	await expect(advance).toBeEnabled();
	await advance.click();
	await page.waitForLoadState('networkidle');
}

export async function playFieldCommandQueueStarterScript(
	page: Page,
	script: readonly ThumperCommand[] = STARTER_COMMAND_QUEUE_SCRIPT
): Promise<void> {
	const expectedScriptLength = requiredCommandQueueScriptLength(STARTER_QUEUE_LENGTH);
	if (script.length !== expectedScriptLength) {
		throw new Error(
			`Expected starter command queue script to have ${expectedScriptLength} commands, received ${script.length}`
		);
	}

	await queueFieldCommandById(page, script[0]!);
	await queueFieldCommandById(page, script[1]!);

	for (let beat = 0; beat < COMMAND_QUEUE_RUN_BEATS; beat += 1) {
		await advanceFieldCommandQueueBeat(page);
		const nextIndex = beat + STARTER_QUEUE_LENGTH;
		if (nextIndex < expectedScriptLength) {
			await queueFieldCommandById(page, script[nextIndex]!);
		}
	}
}

export async function expectFieldCommandQueueClaimReady(page: Page): Promise<void> {
	await expect(page.getByTestId('field-command-queue-claim-ready')).toBeVisible({
		timeout: 15_000
	});
	await expect(page.getByTestId('field-command-queue-claim-button')).toBeEnabled();
}

export async function claimFieldCommandQueue(page: Page): Promise<void> {
	await expectFieldCommandQueueClaimReady(page);
	await page.getByTestId('field-command-queue-claim-button').click();
	await page.waitForLoadState('networkidle');
}

export async function expectFieldBeatReadout(page: Page): Promise<void> {
	const readout = page.getByTestId('field-command-queue-beat-readout');
	await expect(readout).toBeVisible();
	await expect(readout).toContainText(/DRILL|BANK|BRACE|VENT/);
	await expect(readout).toContainText(/FIELD/);
	await expect(readout).toContainText(/Heat \d+\/\d+/);
}

export async function expectFieldClaimRecoveredAboveZero(page: Page): Promise<void> {
	const recovered = page.getByTestId('field-claim-recovered-quantity');
	await expect(recovered).toBeVisible({ timeout: 15_000 });
	const text = await recovered.textContent();
	const units = Number.parseInt(text?.match(/\d+/)?.[0] ?? '0', 10);
	expect(units).toBeGreaterThan(0);
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
