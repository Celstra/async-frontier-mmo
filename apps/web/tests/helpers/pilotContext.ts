import type { BrowserContext } from '@playwright/test';

const PILOT_COOKIE = 'pilot_id';

/** Must match apps/web/playwright.config.ts baseURL host. */
export function smokeBaseUrl(): string {
	return process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
}

export function newSmokePilotId(): string {
	return crypto.randomUUID();
}

export async function seedPilotCookie(context: BrowserContext, pilotId: string): Promise<void> {
	await context.addCookies([
		{
			name: PILOT_COOKIE,
			value: pilotId,
			url: smokeBaseUrl()
		}
	]);
}
