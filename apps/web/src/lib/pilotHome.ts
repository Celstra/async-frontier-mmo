import type { FrameId } from 'shared';

export const FRAME_CHOICE_OPTIONS: ReadonlyArray<{
	id: FrameId;
	title: string;
	verb: string;
}> = [
	{
		id: 'recon',
		title: 'Recon',
		verb: 'Better at reading signals.'
	},
	{
		id: 'engineer',
		title: 'Engineer',
		verb: 'Better at keeping machinery alive.'
	},
	{
		id: 'vanguard',
		title: 'Vanguard',
		verb: 'Better at suppressing threat.'
	}
];

export function frameChoiceLabel(frameId: FrameId): string {
	return FRAME_CHOICE_OPTIONS.find((option) => option.id === frameId)?.title ?? frameId;
}

export function frameChoiceVerb(frameId: FrameId): string {
	return FRAME_CHOICE_OPTIONS.find((option) => option.id === frameId)?.verb ?? '';
}

export function activeBloomDisplayName(bloomId: number): string {
	return `Red Mesa · Bloom #${bloomId}`;
}

export type SuggestedNextAction = {
	label: string;
	detail: string;
	href?: string;
};

export function buildSuggestedNextAction(input: {
	needsFrameChoice: boolean;
	openRun: { targetDisplayName: string; recalled: boolean } | null;
	thumperDemo: { status: string; secondsRemaining: number } | null;
	runReadyToResolve: boolean;
	eventWindows: ReadonlyArray<{ responded: boolean; windowIndex: number }>;
	hasCompletedTutorial: boolean;
	equippedScanner: unknown | null;
	scannerItems: ReadonlyArray<{ id: string }>;
}): SuggestedNextAction {
	if (input.needsFrameChoice) {
		return {
			label: 'Choose your frame',
			detail: 'Pick how you operate on Red Mesa before surveying or deploying.'
		};
	}

	if (input.openRun && input.thumperDemo?.status === 'active' && !input.openRun.recalled) {
		const pendingWindow = input.eventWindows.find((window) => !window.responded);
		if (pendingWindow) {
			return {
				label: 'Respond to thumper event',
				detail: `Window ${pendingWindow.windowIndex} needs a choice on ${input.openRun.targetDisplayName}.`,
				href: '/run'
			};
		}

		return {
			label: 'Monitor thumper run',
			detail: `${input.openRun.targetDisplayName} — about ${input.thumperDemo.secondsRemaining}s remaining.`,
			href: '/run'
		};
	}

	if (
		input.openRun &&
		input.runReadyToResolve &&
		(input.openRun.recalled || input.thumperDemo?.status === 'claimable')
	) {
		return {
			label: 'Claim thumper run',
			detail: `Secure recovered ${input.openRun.targetDisplayName} into inventory.`,
			href: '/claim'
		};
	}

	if (!input.hasCompletedTutorial) {
		return {
			label: 'Survey Red Mesa',
			detail: 'Scan Conductive Metal, sample deposit spots, then deploy on recommended Veyrith Copper.',
			href: '/survey'
		};
	}

		if (input.hasCompletedTutorial && input.scannerItems.length === 0) {
		return {
			label: 'Craft Survey Scanner Module Mk I',
			detail: 'Turn claimed Veyrith Copper into clearer survey information.',
			href: '/craft'
		};
	}

	if (input.scannerItems.length > 0 && !input.equippedScanner) {
		return {
			label: 'Equip Survey Scanner',
			detail: 'Your crafted scanner improves the next survey readout.',
			href: '/craft'
		};
	}

	return {
		label: 'Survey Red Mesa',
		detail: 'Scout the active bloom for your next thumper target.',
		href: '/survey'
	};
}

export function buildRunStatusSummary(input: {
	openRun: { targetDisplayName: string; recalled: boolean } | null;
	thumperDemo: { status: string; secondsRemaining: number } | null;
}): string {
	if (!input.openRun || !input.thumperDemo) {
		return 'No thumper deployed';
	}

	if (input.openRun.recalled) {
		return `Recalled early on ${input.openRun.targetDisplayName} — claim when ready`;
	}

	if (input.thumperDemo.status === 'claimable') {
		return `Run finished on ${input.openRun.targetDisplayName} — ready to claim`;
	}

	if (input.thumperDemo.status === 'active') {
		return `Active on ${input.openRun.targetDisplayName} — ${input.thumperDemo.secondsRemaining}s remaining`;
	}

	return `Thumper on ${input.openRun.targetDisplayName} (${input.thumperDemo.status})`;
}
