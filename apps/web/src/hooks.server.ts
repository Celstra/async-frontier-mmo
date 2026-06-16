import { redirect, type Handle } from '@sveltejs/kit';
import { WORKSHOP_SLICE_PLAYTEST } from '$lib/decision024';

const LEGACY_LOOP_PREFIXES = ['/survey', '/deploy', '/run', '/claim'];
const LEGACY_LOOP_REDIRECT = WORKSHOP_SLICE_PLAYTEST ? '/workshop' : '/field';

const PILOT_ID_COOKIE = 'pilot_id';
const PILOT_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

export const handle: Handle = async ({ event, resolve }) => {
	let pilotId = event.cookies.get(PILOT_ID_COOKIE);
	if (!pilotId) {
		pilotId = crypto.randomUUID();
		event.cookies.set(PILOT_ID_COOKIE, pilotId, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			maxAge: PILOT_COOKIE_MAX_AGE
		});
	}

	event.locals.pilotId = pilotId;

	if (LEGACY_LOOP_PREFIXES.some((prefix) => event.url.pathname.startsWith(prefix))) {
		redirect(303, LEGACY_LOOP_REDIRECT);
	}

	return resolve(event);
};
