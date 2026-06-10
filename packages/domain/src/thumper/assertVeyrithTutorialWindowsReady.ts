export type TutorialWindowRow = {
	windowIndex: number;
	complication: string;
	chosenResponse: string | null;
};

/**
 * Decision 011 — Veyrith first-session claim requires tutorial windows to be
 * completed or ended early via Recall Early.
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

	const recallWindow = windows.find((window) => window.chosenResponse === 'recall_early');
	if (recallWindow) {
		for (const window of windows) {
			if (window.windowIndex < recallWindow.windowIndex && window.chosenResponse === null) {
				throw new Error('Windows before recall must be answered');
			}
			if (window.windowIndex > recallWindow.windowIndex && window.chosenResponse !== null) {
				throw new Error('No responses are allowed after Recall Early');
			}
		}
		return;
	}

	if (window1.chosenResponse === null || window2.chosenResponse === null) {
		throw new Error('Veyrith tutorial run requires a response on every event window');
	}
}
