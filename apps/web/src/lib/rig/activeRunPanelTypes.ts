/** Route-neutral props for the shared FIELD/RIG active thumper run panel. */

export type ActiveRunEventOption = {
	id: string;
	label: string;
	enabled: boolean;
	disabledReason?: string | null;
	effectLine?: string;
};

export type ActiveRunEventWindow = {
	windowIndex: number;
	quiet: boolean;
	responded: boolean;
	complication?: string | null;
	severity?: string | null;
	matchingActionLabel?: string | null;
	chosenResponse?: string | null;
	responseOptions: ActiveRunEventOption[];
	outcomeLine?: string | null;
};

export type ActiveRunMeters = {
	projectedRecovery: number;
	signalLock: number;
	pumpFlow: number;
	threatPressure: number;
	hullCondition: number;
};

export type ActiveRunPanelRun = {
	thumperDemo: { secondsRemaining: number; status: string } | null;
	loadedAt: string;
	runDurationSeconds: number;
	effectiveDurationSeconds?: number;
	failsafeActive?: boolean;
	runHullCondition: number;
	runHullIntegrity?: number | null;
	drillCondition: number | null;
	pumpCondition: number | null;
	runMeters: ActiveRunMeters | null;
	runReadyToResolve: boolean;
	eventWindows: ActiveRunEventWindow[];
	openRun: {
		targetDisplayName: string;
	};
};

export type ActiveRunClaimView =
	| {
			mode: 'claimable';
			runId: string;
	  }
	| {
			mode: 'result';
			runId: string;
			tutorialRecallBannerLine?: string | null;
			tutorialComparisonLine?: string | null;
			explanation: { summary: string };
			claimResult: { recoveredQuantity: number };
	  }
	| null;
