import type { OverallThumperCondition, ResourceFamily, SurveyEnergyOutlook } from '@async-frontier-mmo/domain';
import type { FrameId } from 'shared';

export type HubThumperState = 'idle' | 'active' | 'ready_to_claim';

export type HubEquippedPartSummary = {
	displayName: string;
	condition: number;
};

export type HubWorkbenchSchematicSummary = {
	schematicId: string;
	displayName: string;
	craftableNow: boolean;
	firstBlocker: string | null;
};

export type HubTile =
	| {
			id: 'thumper';
			why: string;
			href: string;
			state: HubThumperState;
			headline: string;
			detail: string;
			targetResource: string | null;
			secondsRemaining: number | null;
			overallConditionLine: string | null;
			equippedParts: {
				drill: HubEquippedPartSummary | null;
				pump: HubEquippedPartSummary | null;
				hull: HubEquippedPartSummary | null;
			};
	  }
	| {
			id: 'survey';
			why: string;
			href: string;
			surveyEnergy: number;
			surveyEnergyCap: number;
			outlook: SurveyEnergyOutlook;
			sampledSpotCount: number;
			hasFamilyScan: boolean;
			detail: string;
	  }
	| {
			id: 'workbench';
			why: string;
			href: string;
			schematicSummaries: HubWorkbenchSchematicSummary[];
			detail: string;
	  }
	| {
			id: 'storage';
			why: string;
			href: string;
			familyCounts: Record<ResourceFamily, number>;
			repairKitCount: number;
			detail: string;
	  };

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
	eventWindows: ReadonlyArray<{ responded: boolean; windowIndex: number; quiet?: boolean }>;
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
		const pendingWindow = input.eventWindows.find((window) => !window.quiet && !window.responded);
		if (pendingWindow) {
			return {
				label: 'Respond to thumper event',
				detail: `Window ${pendingWindow.windowIndex} needs a choice on ${input.openRun.targetDisplayName}.`,
				href: '/field'
			};
		}

		return {
			label: 'Monitor thumper run',
			detail: `${input.openRun.targetDisplayName} — about ${input.thumperDemo.secondsRemaining}s remaining.`,
			href: '/field'
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
			href: '/field'
		};
	}

	if (!input.hasCompletedTutorial) {
		return {
			label: 'Survey Red Mesa',
			detail: 'Scan Conductive Metal, sample deposit spots, then deploy on recommended Veyrith Copper.',
			href: '/field'
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
		href: '/field'
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

function hubEquippedPart(
	part: HubEquippedPartSummary | null,
	fallbackName: string
): HubEquippedPartSummary {
	return part ?? { displayName: fallbackName, condition: 100 };
}

export function buildHubTiles(input: {
	needsFrameChoice: boolean;
	openRun: { targetDisplayName: string; recalled: boolean } | null;
	thumperDemo: { status: string; secondsRemaining: number } | null;
	runReadyToResolve: boolean;
	equippedThumperParts: {
		drill: HubEquippedPartSummary | null;
		pump: HubEquippedPartSummary | null;
		hull: HubEquippedPartSummary | null;
	};
	overallThumperCondition: OverallThumperCondition | null;
	surveyEnergy: number;
	surveyEnergyCap: number;
	surveyEnergyOutlook: SurveyEnergyOutlook;
	sampledSpotCount: number;
	hasFamilyScan: boolean;
	workbenchSummaries: HubWorkbenchSchematicSummary[];
	familyCounts: Record<ResourceFamily, number>;
	repairKitCount: number;
}): HubTile[] {
	const thumperParts = {
		drill: hubEquippedPart(input.equippedThumperParts.drill, 'Worn Basic Drill'),
		pump: hubEquippedPart(input.equippedThumperParts.pump, 'Worn Basic Pump'),
		hull: hubEquippedPart(input.equippedThumperParts.hull, 'Worn Basic Hull')
	};

	let thumperState: HubThumperState = 'idle';
	let thumperHeadline = 'No thumper deployed';
	let thumperDetail = 'Survey a deposit spot, then deploy your personal thumper.';
	let thumperHref = '/field';
	let targetResource: string | null = null;
	let secondsRemaining: number | null = null;

	if (input.needsFrameChoice) {
		thumperHeadline = 'Choose a frame first';
		thumperDetail = 'Pick Recon, Engineer, or Vanguard before deploying.';
		thumperHref = '/';
	} else if (
		input.openRun &&
		input.runReadyToResolve &&
		(input.openRun.recalled || input.thumperDemo?.status === 'claimable')
	) {
		thumperState = 'ready_to_claim';
		thumperHeadline = 'Thumper ready to claim';
		targetResource = input.openRun.targetDisplayName;
		thumperDetail = `Secure recovered ${input.openRun.targetDisplayName} into inventory.`;
		thumperHref = '/field';
	} else if (input.openRun && input.thumperDemo) {
		thumperState = 'active';
		targetResource = input.openRun.targetDisplayName;
		secondsRemaining = input.thumperDemo.secondsRemaining;
		thumperHeadline = input.openRun.recalled
			? `Recalled on ${input.openRun.targetDisplayName}`
			: `Thumper active on ${input.openRun.targetDisplayName}`;
		thumperDetail = input.openRun.recalled
			? 'Run ended early — claim partial recovery when ready.'
			: `${input.thumperDemo.secondsRemaining}s remaining in this run phase.`;
		thumperHref = '/field';
	}

	const scannerSummary = input.workbenchSummaries.find(
		(summary) => summary.schematicId === 'survey_scanner_mk_i'
	);
	const workbenchDetail = scannerSummary?.craftableNow
		? 'Survey Scanner Mk I is ready to craft.'
		: (scannerSummary?.firstBlocker ??
			'Check schematic slots before committing resources to a craft.');

	const surveyDetail = input.hasFamilyScan
		? input.sampledSpotCount > 0
			? `${input.sampledSpotCount} deposit spot${input.sampledSpotCount === 1 ? '' : 's'} sampled this bloom.`
			: 'Family scanned — sample deposit spots to reveal concentrations.'
		: 'Scan a resource family to reveal deposit signals.';

	const storageTotal = Object.values(input.familyCounts).reduce((sum, count) => sum + count, 0);
	const storageDetail =
		storageTotal > 0
			? `${storageTotal} resource units across three families.`
			: 'Starter stockpile and thumper hauls fill your ledger here.';

	return [
		{
			id: 'thumper',
			why: 'Deploy on a sampled signal, respond to events, then claim your haul.',
			href: thumperHref,
			state: thumperState,
			headline: thumperHeadline,
			detail: thumperDetail,
			targetResource,
			secondsRemaining,
			overallConditionLine: input.overallThumperCondition?.displayLine ?? null,
			equippedParts: thumperParts
		},
		{
			id: 'survey',
			why: 'Find deposit signals, sample spots, and pick your next thumper target.',
			href: '/field',
			surveyEnergy: input.surveyEnergy,
			surveyEnergyCap: input.surveyEnergyCap,
			outlook: input.surveyEnergyOutlook,
			sampledSpotCount: input.sampledSpotCount,
			hasFamilyScan: input.hasFamilyScan,
			detail: surveyDetail
		},
		{
			id: 'workbench',
			why: 'Turn your haul into gear — a crafted scanner makes your next survey clearer.',
			href: '/craft',
			schematicSummaries: input.workbenchSummaries,
			detail: workbenchDetail
		},
		{
			id: 'storage',
			why: 'Track claimed resources and repair kits that feed your next craft or run.',
			href: '/inventory',
			familyCounts: input.familyCounts,
			repairKitCount: input.repairKitCount,
			detail: storageDetail
		}
	];
}
