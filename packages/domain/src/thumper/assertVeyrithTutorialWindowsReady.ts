export type TutorialWindowRow = {
	windowIndex: number;
	complication: string;
	chosenResponse: string | null;
};

/**
 * Decision 011 — Veyrith first-session claim requires exactly two answered tutorial windows.
 */
export function assertVeyrithTutorialWindowsReady(windows: ReadonlyArray<TutorialWindowRow>): void {
	if (windows.length !== 2) {
		throw new Error(
			`Veyrith tutorial run requires exactly 2 event windows, got ${windows.length}`
		);
	}

	const [window1, window2] = windows;

	if (window1.windowIndex !== 1 || window1.complication !== 'signal_drift') {
		throw new Error('Veyrith tutorial window 1 must be signal_drift');
	}

	if (window2.windowIndex !== 2 || window2.complication !== 'pump_strain') {
		throw new Error('Veyrith tutorial window 2 must be pump_strain');
	}

	if (window1.chosenResponse === null || window2.chosenResponse === null) {
		throw new Error('Veyrith tutorial run requires a response on every event window');
	}
}
