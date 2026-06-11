/**
 * Format a duration in seconds to a human-readable string.
 *
 * - >= 1 hour: "2h 14m"
 * - >= 1 minute: "14m 05s"
 * - else: "45s"
 *
 * Used for countdown displays and duration remaining throughout the UI.
 */
export function formatDuration(seconds: number): string {
	if (seconds <= 0) {
		return '0s';
	}

	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours >= 1) {
		return `${hours}h ${minutes.toString().padStart(2, '0')}m`;
	}

	if (minutes >= 1) {
		return `${minutes}m ${secs.toString().padStart(2, '0')}s`;
	}

	return `${secs}s`;
}

/**
 * Format extraction tail minutes for human-readable display.
 * Converts "480 minutes" style to "8h" for long durations.
 */
export function formatExtractionTail(minutes: number): string {
	if (minutes >= 60) {
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		if (remainingMinutes === 0) {
			return `${hours}h`;
		}
		return `${hours}h ${remainingMinutes}m`;
	}
	return `${minutes}m`;
}
