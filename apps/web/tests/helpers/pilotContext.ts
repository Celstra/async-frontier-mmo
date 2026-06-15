import type { BrowserContext } from '@playwright/test';

const PILOT_COOKIE = 'pilot_id';

/** Fallback when Playwright `baseURL` fixture is unavailable. */
export function smokeBaseUrl(): string {
	return process.env.PLAYWRIGHT_BASE_URL ?? 'http://127.0.0.1:5173';
}

export function newSmokePilotId(): string {
	return crypto.randomUUID();
}

export async function seedPilotCookie(
	context: BrowserContext,
	pilotId: string,
	baseURL: string = smokeBaseUrl()
): Promise<void> {
	await context.addCookies([
		{
			name: PILOT_COOKIE,
			value: pilotId,
			url: baseURL,
			httpOnly: true,
			sameSite: 'Lax'
		}
	]);
}
