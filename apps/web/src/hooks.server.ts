import type { Handle } from '@sveltejs/kit';

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
	return resolve(event);
};
