import type { RequestEvent } from '@sveltejs/kit';

/** Session-scoped pilot id (cookie set in hooks.server.ts). Auth replaces this later. */
export function resolvePilotId(event: RequestEvent): string {
	return event.locals.pilotId;
}
