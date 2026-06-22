import { defineConfig, devices } from '@playwright/test';
import { loadSmokeEnvFiles } from './scripts/smoke-env.mjs';

loadSmokeEnvFiles();

const devPort = process.env.PLAYWRIGHT_DEV_PORT ?? '5173';
const baseURL = process.env.PLAYWRIGHT_BASE_URL ?? `http://127.0.0.1:${devPort}`;
const webServerReadyURL = process.env.PLAYWRIGHT_READY_URL ?? new URL('/field', baseURL).toString();

export default defineConfig({
	testDir: 'tests',
	globalSetup: './tests/global-setup.ts',
	fullyParallel: false,
	forbidOnly: Boolean(process.env.CI),
	retries: process.env.CI ? 2 : 0,
	reporter: 'list',
	workers: 1,
	use: {
		baseURL,
		trace: 'on-first-retry'
	},
	webServer: process.env.PLAYWRIGHT_BASE_URL
		? undefined
		: {
				command: `pnpm dev --host 127.0.0.1 --port ${devPort}`,
				url: webServerReadyURL,
				reuseExistingServer:
					!process.env.CI && !process.env.PLAYWRIGHT_FORCE_NEW_SERVER,
				timeout: 120_000,
				env: {
					...process.env,
					DATABASE_URL: process.env.DATABASE_URL ?? ''
				}
			},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: [
				'**/first-session-path.smoke.spec.ts',
				'**/craft-reveal.smoke.spec.ts',
				'**/workshop-craft-telemetry.smoke.spec.ts',
				'**/workshop-acceptance-path.smoke.spec.ts'
			]
		},
	{
		name: 'chromium-path',
		use: { ...devices['Desktop Chrome'] },
		testMatch: '**/workshop-acceptance-path.smoke.spec.ts'
	},
		{
			name: 'chromium-craft-reveal',
			use: { ...devices['Desktop Chrome'] },
			testMatch: '**/craft-reveal.smoke.spec.ts'
		},
		{
			name: 'chromium-workshop-db',
			use: { ...devices['Desktop Chrome'] },
			testMatch: [
				'**/workshop-craft-telemetry.smoke.spec.ts',
				'**/workshop-acceptance-path.smoke.spec.ts'
			]
		},
		{
			name: 'mobile',
			use: { ...devices['Pixel 7'] },
			testIgnore: [
				'**/first-session-path.smoke.spec.ts',
				'**/craft-reveal.smoke.spec.ts',
				'**/workshop-craft-telemetry.smoke.spec.ts',
				'**/workshop-acceptance-path.smoke.spec.ts'
			]
		}
	]
});
