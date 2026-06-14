import { execSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';
import { loadSmokeEnvFiles } from '../scripts/smoke-env.mjs';

const webRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

export default async function globalSetup(): Promise<void> {
	try {
		const browser = await chromium.launch();
		await browser.close();
	} catch {
		console.log('Playwright Chromium missing — installing…');
		execSync('pnpm exec playwright install chromium', {
			stdio: 'inherit',
			cwd: webRoot
		});
	}

	loadSmokeEnvFiles();

	if (!process.env.DATABASE_URL) {
		console.warn(
			'[smoke:browser] DATABASE_URL is unset — layout smoke only; smoke:browser:path and smoke:browser:gate fail fast without it'
		);
	}
}
