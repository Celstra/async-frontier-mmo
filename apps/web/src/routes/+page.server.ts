import {
	BLOOM_ONE_ID,
	getActiveBloomId,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	getOpenThumperRunForPilot,
	getPilotById,
	getPilotFrame,
	createDb,
	ensurePilotGameReady,
	ensureSessionPilot,
	hasPilotCompletedTutorialThumper,
	listPilotResourceStacksWithInstances,
	listScannerItemsForPilot,
	pilotNeedsFrameChoice,
	rotateActiveBloom,
	setPilotFrame
} from '@async-frontier-mmo/db';
import { TUTORIAL_RUN_SEED } from '@async-frontier-mmo/domain';
import { dev } from '$app/environment';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import { isFrameId, parseFrameId } from 'shared';
import {
	activeBloomDisplayName,
	buildRunStatusSummary,
	buildSuggestedNextAction,
	frameChoiceLabel,
	frameChoiceVerb,
	FRAME_CHOICE_OPTIONS
} from '$lib/pilotHome';
import { resolvePilotId } from '$lib/server/pilot';
import { loadOpenRunState } from '$lib/server/runLoad';
import { resolveTargetDisplayName } from '$lib/server/targetResource';
import type { Actions, PageServerLoad } from './$types';

function getDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'DATABASE_URL is not configured');
	}
	return createDb(databaseUrl);
}

async function loadEquippedThumperPartsSummary(db: ReturnType<typeof getDb>, pilotId: string) {
	const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
	return {
		drill: equipped.drill
			? {
					displayName: equipped.drill.displayName,
					condition: equipped.drill.condition,
					integrity: equipped.drill.integrity
				}
			: null,
		pump: equipped.pump
			? {
					displayName: equipped.pump.displayName,
					condition: equipped.pump.condition,
					integrity: equipped.pump.integrity
				}
			: null,
		hull: equipped.hull
			? {
					displayName: equipped.hull.displayName,
					condition: equipped.hull.condition,
					integrity: equipped.hull.integrity
				}
			: null
	};
}

async function loadScannerContext(db: ReturnType<typeof getDb>, pilotId: string) {
	const equippedScanner = await getEquippedScannerForPilot(db, pilotId);
	const activeBloomId = await getActiveBloomId(db);
	const scannerItems = await listScannerItemsForPilot(db, pilotId);

	return {
		activeBloomId,
		scannerItems: scannerItems.map((item) => ({
			id: item.id,
			displayName: item.displayName,
			equipped: equippedScanner?.id === item.id
		})),
		equippedScanner: equippedScanner
			? {
					displayName: equippedScanner.displayName
				}
			: null
	};
}

async function loadPilotHomeContext(
	db: ReturnType<typeof getDb>,
	input: {
		pilotFrame: ReturnType<typeof parseFrameId>;
		needsFrameChoice: boolean;
		activeBloomId: number;
		inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>;
		equippedScanner: Awaited<ReturnType<typeof loadScannerContext>>['equippedScanner'];
		scannerItems: Awaited<ReturnType<typeof loadScannerContext>>['scannerItems'];
		equippedThumperParts: Awaited<ReturnType<typeof loadEquippedThumperPartsSummary>>;
		openRun: { targetDisplayName: string; recalled: boolean } | null;
		thumperDemo: { status: string; secondsRemaining: number } | null;
		runReadyToResolve: boolean;
		eventWindows: ReadonlyArray<{ responded: boolean; windowIndex: number }>;
		hasCompletedTutorial: boolean;
	}
) {
	const resourceSummary = input.inventory.map((stack) => ({
		displayName: stack.displayName,
		quantity: stack.quantity,
		family: stack.family
	}));

	return {
		needsFrameChoice: input.needsFrameChoice,
		frameChoiceOptions: FRAME_CHOICE_OPTIONS,
		pilotFrame: input.pilotFrame,
		frameLabel: frameChoiceLabel(input.pilotFrame),
		frameVerb: frameChoiceVerb(input.pilotFrame),
		activeBloomName: activeBloomDisplayName(input.activeBloomId),
		runStatusSummary: buildRunStatusSummary({
			openRun: input.openRun,
			thumperDemo: input.thumperDemo
		}),
		resourceSummary,
		equippedScannerSummary: input.equippedScanner?.displayName ?? 'Basic Scanner Mk 0',
		equippedPartsSummary: {
			drill: input.equippedThumperParts.drill?.displayName ?? 'Worn Basic Drill',
			pump: input.equippedThumperParts.pump?.displayName ?? 'Worn Basic Pump',
			hull: input.equippedThumperParts.hull?.displayName ?? 'Worn Basic Hull'
		},
		suggestedNextAction: buildSuggestedNextAction({
			needsFrameChoice: input.needsFrameChoice,
			openRun: input.openRun,
			thumperDemo: input.thumperDemo,
			runReadyToResolve: input.runReadyToResolve,
			eventWindows: input.eventWindows,
			hasCompletedTutorial: input.hasCompletedTutorial,
			equippedScanner: input.equippedScanner,
			scannerItems: input.scannerItems
		})
	};
}

export const load: PageServerLoad = async (event) => {
	const db = getDb();
	const pilotId = resolvePilotId(event);
	await ensureSessionPilot(db, pilotId);
	const pilot = await getPilotById(db, pilotId);
	if (!pilot) {
		error(500, 'Session pilot missing after ensure');
	}

	const needsFrameChoice = pilotNeedsFrameChoice(pilot);
	if (!needsFrameChoice) {
		await ensurePilotGameReady(db, pilotId);
	}

	const pilotFrame = await getPilotFrame(db, pilotId);
	const hasCompletedTutorial = needsFrameChoice
		? false
		: await hasPilotCompletedTutorialThumper(db, pilotId, TUTORIAL_RUN_SEED);

	if (needsFrameChoice) {
		return {
			...(await loadPilotHomeContext(db, {
				pilotFrame,
				needsFrameChoice: true,
				activeBloomId: BLOOM_ONE_ID,
				inventory: [],
				equippedScanner: null,
				scannerItems: [],
				equippedThumperParts: { drill: null, pump: null, hull: null },
				openRun: null,
				thumperDemo: null,
				runReadyToResolve: false,
				eventWindows: [],
				hasCompletedTutorial: false
			})),
			thumperDemo: null,
			loadedAt: null,
			openRun: null,
			eventWindows: [],
			runReadyToResolve: false,
			hasCompletedTutorial: false,
			activeBloomId: BLOOM_ONE_ID
		};
	}

	const surveyContext = await loadScannerContext(db, pilotId);
	const inventory = await listPilotResourceStacksWithInstances(db, pilotId);
	const equippedThumperParts = await loadEquippedThumperPartsSummary(db, pilotId);
	const run = await getOpenThumperRunForPilot(db, pilotId);

	const pilotHomeBase = {
		pilotFrame,
		needsFrameChoice: false,
		activeBloomId: surveyContext.activeBloomId,
		inventory,
		equippedScanner: surveyContext.equippedScanner,
		scannerItems: surveyContext.scannerItems,
		equippedThumperParts,
		hasCompletedTutorial
	};

	if (!run) {
		const pilotHome = await loadPilotHomeContext(db, {
			...pilotHomeBase,
			openRun: null,
			thumperDemo: null,
			runReadyToResolve: false,
			eventWindows: []
		});

		return {
			...pilotHome,
			thumperDemo: null,
			loadedAt: null,
			openRun: null,
			eventWindows: [],
			runReadyToResolve: false,
			hasCompletedTutorial,
			activeBloomId: surveyContext.activeBloomId
		};
	}

	const state = await loadOpenRunState(db, run, 0, {
		resolveDisplayName: resolveTargetDisplayName
	});
	const pilotHome = await loadPilotHomeContext(db, {
		...pilotHomeBase,
		openRun: state.openRun,
		thumperDemo: state.thumperDemo,
		runReadyToResolve: state.runReadyToResolve,
		eventWindows: state.eventWindows
	});

	return {
		...pilotHome,
		hasCompletedTutorial,
		activeBloomId: surveyContext.activeBloomId,
		...state
	};
};

export const actions: Actions = {
	chooseFrame: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		await ensureSessionPilot(db, pilotId);

		const pilot = await getPilotById(db, pilotId);
		if (pilot && !pilotNeedsFrameChoice(pilot)) {
			return fail(400, { message: 'Frame already chosen for this pilot' });
		}

		const formData = await event.request.formData();
		const frameIdRaw = formData.get('frameId');
		if (typeof frameIdRaw !== 'string' || !isFrameId(frameIdRaw)) {
			return fail(400, { message: 'Choose Recon, Engineer, or Vanguard' });
		}

		await setPilotFrame(db, pilotId, frameIdRaw);
	},

	rotateBloom: async (event) => {
		if (!dev) {
			return fail(403, { message: 'Rotate bloom is only available in dev builds' });
		}

		const db = getDb();
		const pilotId = resolvePilotId(event);
		await ensureSessionPilot(db, pilotId);
		const pilot = await getPilotById(db, pilotId);
		if (!pilot || pilotNeedsFrameChoice(pilot)) {
			return fail(400, { message: 'Choose a frame before continuing' });
		}
		await ensurePilotGameReady(db, pilotId);

		const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
			db,
			pilotId,
			TUTORIAL_RUN_SEED
		);
		if (!hasCompletedTutorial) {
			return fail(400, {
				message: 'Complete the bloom #1 tutorial thumper before rotating resources'
			});
		}

		const outcome = await rotateActiveBloom(db, { pilotId });
		if (outcome.status === 'no_active_bloom') {
			return fail(400, { message: 'No active bloom to rotate' });
		}

		return {
			hasCompletedTutorial,
			bloomRotation: outcome
		};
	}
};
