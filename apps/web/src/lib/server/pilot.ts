import type { RequestEvent } from '@sveltejs/kit';
import { DEMO_PILOT_ID } from 'shared';

/** Lesson 7.1 will replace this with session-derived pilot identity. */
export function resolvePilotId(_event: RequestEvent): string {
	return DEMO_PILOT_ID;
}
