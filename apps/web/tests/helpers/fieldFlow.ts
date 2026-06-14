import { expect, type Page } from '@playwright/test';

export async function scanAndSampleOnField(
	page: Page,
	options?: { stayOnPage?: boolean; allowSkip?: boolean }
): Promise<void> {
	if (!options?.stayOnPage) {
		await page.goto('/field');
	}

	const scanFamily = page.getByRole('button', { name: 'Scan family' });
	if (await scanFamily.isVisible()) {
		await scanFamily.click();
		await page.waitForLoadState('networkidle');
	}

	const liveSignals = page.locator('section.panel').filter({ hasText: 'Live signals' });
	if (await liveSignals.isVisible()) {
		const firstSignal = liveSignals.getByRole('button').first();
		if (await firstSignal.isVisible()) {
			await firstSignal.click();
			await page.waitForLoadState('networkidle');
		}
	}

	const scanHere = page.getByRole('button', { name: 'Scan here' });
	if (await scanHere.isVisible()) {
		await scanHere.click();
		await page.waitForLoadState('networkidle');
	}

	const sampleButton = page.getByRole('button', { name: 'Sample here' });
	if (options?.allowSkip) {
		if (await page.getByText(/Surface remnants exhausted/i).isVisible()) {
			return;
		}
		if (!(await sampleButton.isEnabled({ timeout: 3000 }).catch(() => false))) {
			return;
		}
	} else {
		await expect(sampleButton).toBeEnabled({ timeout: 10_000 });
	}
	await sampleButton.click();
	if (
		options?.allowSkip &&
		!(await page.getByText(/Sampling/).isVisible({ timeout: 5000 }).catch(() => false))
	) {
		return;
	}
	await expect(page.getByText(/Sampling/)).toBeVisible({ timeout: 5000 });
	await page.waitForTimeout(11_000);
	await page.reload({ waitUntil: 'networkidle' });
	await expect(page.getByText(/Sample complete/)).toBeVisible({ timeout: 15_000 });
}

export async function selectFieldFamily(page: Page, label: string): Promise<void> {
	await page.goto('/field');
	await page.getByRole('button', { name: label, exact: true }).click();
	await page.waitForLoadState('networkidle');
}

async function isActiveFocusOrderFilled(page: Page): Promise<boolean> {
	const focusCard = page.locator('.order-card--active').first();
	if ((await focusCard.count()) === 0) {
		return false;
	}
	const status = await focusCard.locator('.order-card__status').textContent();
	return status?.trim() === 'Filled';
}

/** Sample and turn in until the current foreman order stack is complete. */
export async function fillActiveOrderToCompletion(page: Page, maxCycles = 24): Promise<void> {
	for (let cycle = 0; cycle < maxCycles; cycle += 1) {
		await page.goto('/settlement');

		if (await page.getByRole('dialog', { name: /FABRICATOR ONLINE/i }).isVisible()) {
			return;
		}

		const turnIn = page.getByRole('button', { name: /Turn in \d+u from inventory/ });
		if (await turnIn.isVisible()) {
			await turnIn.click();
			await page.waitForLoadState('networkidle');
			continue;
		}

		if (await isActiveFocusOrderFilled(page)) {
			return;
		}

		await scanAndSampleOnField(page);
	}

	throw new Error(`Active foreman order did not reach Filled status after ${maxCycles} field cycles`);
}

export async function dismissFabricatorTakeover(page: Page): Promise<void> {
	await page.goto('/settlement');
	const dialog = page.getByRole('dialog', { name: /FABRICATOR ONLINE/i });
	await expect(dialog).toBeVisible({ timeout: 60_000 });
	await dialog.getByRole('button', { name: 'Continue' }).click();
	await expect(dialog).toBeHidden({ timeout: 15_000 });
}

/** Hand-fill and turn in both fabricator_online foreman orders, then dismiss the takeover. */
export async function completeTutorialFabricatorHandoff(page: Page): Promise<void> {
	await fillActiveOrderToCompletion(page);
	await selectFieldFamily(page, 'Conductive Metal');
	await fillActiveOrderToCompletion(page);
	await dismissFabricatorTakeover(page);
}

/** Navigate to the locked Keth Iron waypoint; sample only if deploy is not unlocked yet. */
export async function prepareLockedKethDeployWaypoint(page: Page): Promise<void> {
	await selectFieldFamily(page, 'Structural Alloy');
	await page.goto('/field');

	const deployButton = page
		.locator('section.panel')
		.filter({ hasText: 'Deploy thumper' })
		.getByRole('button', { name: /min/i })
		.first();

	const kethWaypoint = page.getByRole('button', { name: /Keth Iron:/i });
	if (await kethWaypoint.isVisible()) {
		await kethWaypoint.click();
		await page.waitForLoadState('networkidle');
		if (await deployButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
			return;
		}
	}

	const scanFamily = page.getByRole('button', { name: 'Scan family' });
	if (await scanFamily.isVisible()) {
		await scanFamily.click();
		await page.waitForLoadState('networkidle');
	}

	const kethSignal = page.getByRole('button', { name: 'Keth Iron', exact: true });
	if (await kethSignal.isVisible()) {
		await kethSignal.click();
		await page.waitForLoadState('networkidle');
	}

	if (await deployButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
		return;
	}

	await scanAndSampleOnField(page, { stayOnPage: true, allowSkip: true });
	await expect(deployButton).toBeVisible({ timeout: 15_000 });
}

export async function assembleRigOnWorkshop(page: Page): Promise<void> {
	await page.goto('/workshop?station=thumper');
	await page.waitForLoadState('networkidle');
	await expect(page.getByText('Complete the fabricator milestone at SETTLEMENT')).toBeHidden({
		timeout: 20_000
	});

	const sockets = page.locator('section.socket');
	await expect(sockets).toHaveCount(3, { timeout: 15_000 });

	for (let index = 0; index < 3; index += 1) {
		const socket = sockets.nth(index);
		await socket.locator('button.socket__header').click();
		const candidate = socket.locator('button.candidate-row').first();
		await expect(candidate).toBeVisible({ timeout: 15_000 });
		await candidate.click();
	}

	await page.getByRole('button', { name: 'Assemble rig' }).click();
	await page.waitForLoadState('networkidle');
	await expect(page.getByRole('status')).toContainText('Rig assembled', { timeout: 15_000 });
}

/** Resolve every open RIG event window before claim. */
export async function resolveEventWindowsOnRig(page: Page, maxWindows = 6): Promise<void> {
	for (let attempt = 0; attempt < maxWindows; attempt += 1) {
		const option = page
			.locator('.event-window .event-option:not([disabled])')
			.filter({ hasNotText: /Recall early/i })
			.first();
		if ((await option.count()) === 0) {
			return;
		}
		await option.click({ force: true });
		await page.waitForLoadState('networkidle');
	}
}

export async function claimThumperOnRig(page: Page): Promise<void> {
	for (let attempt = 0; attempt < 2; attempt += 1) {
		await page.goto('/rig');
		await page.reload({ waitUntil: 'networkidle' });

		const ack = page.getByRole('button', { name: /Send to storage/i });
		if (await ack.isVisible({ timeout: 5000 }).catch(() => false)) {
			await ack.click();
			await page.waitForLoadState('networkidle');
			return;
		}

		const claim = page.getByRole('button', { name: /Claim yield/i });
		if (!(await claim.isVisible({ timeout: 5000 }).catch(() => false))) {
			await resolveEventWindowsOnRig(page);
		}

		if (await claim.isVisible({ timeout: 5000 }).catch(() => false)) {
			await claim.click();
			await page.waitForLoadState('networkidle');
		}

		if (await ack.isVisible({ timeout: 15_000 }).catch(() => false)) {
			await ack.click();
			await page.waitForLoadState('networkidle');
			return;
		}

		if (!(await page.getByText('Active deployment').isVisible())) {
			return;
		}
	}

	throw new Error('Claim did not complete — RIG still shows an active deployment');
}

export async function acknowledgeRecallAndPatchHull(page: Page): Promise<void> {
	await page.goto('/settlement');

	const recall = page.getByRole('button', { name: /Acknowledge recall — patch hull next/i });
	await expect(recall).toBeVisible({ timeout: 20_000 });
	await recall.click();
	await page.waitForLoadState('networkidle');

	const patch = page.getByRole('button', { name: /Patch hull — restore/i });
	await expect(patch).toBeVisible({ timeout: 20_000 });
	await patch.click();
	await page.waitForLoadState('networkidle');
}

export async function deployTutorialTrainingRun(
	page: Page,
	tailLabel: RegExp
): Promise<void> {
	await prepareLockedKethDeployWaypoint(page);

	const deployPanel = page.locator('section.panel').filter({ hasText: 'Deploy thumper' });
	let deploy = deployPanel.getByRole('button', { name: tailLabel }).first();
	if (!(await deploy.isVisible({ timeout: 3_000 }).catch(() => false))) {
		await page.goto('/field');
		const kethWaypoint = page.getByRole('button', { name: /Keth Iron:/i });
		if (await kethWaypoint.isVisible()) {
			await kethWaypoint.click();
			await page.waitForLoadState('networkidle');
		}
		deploy = deployPanel.getByRole('button', { name: tailLabel }).first();
	}
	await expect(deploy).toBeVisible({ timeout: 15_000 });
	await deploy.click();
	await page.waitForLoadState('networkidle');
	await expect(page.getByText(/monitor events on/i)).toBeVisible({ timeout: 15_000 });
}

export async function chooseFirstAsyncDuration(page: Page): Promise<void> {
	await page.goto('/settlement');

	const picker = page.locator('section.panel[aria-label="Async deployment reveal"]');
	await expect(picker).toBeVisible({ timeout: 20_000 });

	const fifteenMin = picker.getByRole('button', { name: /15 min/i }).first();
	await expect(fifteenMin).toBeEnabled({ timeout: 10_000 });
	await fifteenMin.click();
	await page.waitForLoadState('networkidle');
}
