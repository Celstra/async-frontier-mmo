export type WorkshopUxTelemetryEvent =
	| 'mission_panel_seen'
	| 'first_socket_cta_clicked'
	| 'slot_hint_seen'
	| 'safe_to_experiment_nudge_seen'
	| 'experiment_after_safe_craft';

export async function postWorkshopUxTelemetry(
	telemetryEvent: WorkshopUxTelemetryEvent,
	payload?: Record<string, unknown>
): Promise<void> {
	const body = new FormData();
	body.set('telemetryEvent', telemetryEvent);
	if (payload) {
		body.set('payload', JSON.stringify(payload));
	}
	await fetch('?/workshopUxTelemetry', { method: 'POST', body, keepalive: true });
}
