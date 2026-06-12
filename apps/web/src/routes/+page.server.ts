import {
	BLOOM_ONE_ID,
	countFieldRepairKitsForPilot,
	getActiveBloomId,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	getOpenThumperRunForPilot,
	getPilotProspectingProgress,
	createDb,
	ensurePilotGameReady,
	ensureSessionPilot,
	hasPilotCompletedTutorialThumper,
	hasPilotFamilyScan,
	listPilotResourceStacksWithInstances,
	listScannerItemsForPilot,
	rotateActiveBloom
} from '@async-frontier-mmo/db';
import {
	analyzeSchematicReadiness,
	MVP_CRAFT_SCHEMATICS,
	overallThumperCondition,
	SURVEY_ENERGY_CAP,
	surveyEnergyOutlook,
	TUTORIAL_RUN_SEED,
	type ResourceFamily,
	type ThumperPartSnapshot
} from '@async-frontier-mmo/domain';
import { dev } from '$app/environment';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import {
	activeBloomDisplayName,
	buildHubTiles,
	buildRunStatusSummary,
	buildSuggestedNextAction,
	FRAME_CHOICE_OPTIONS,
	type HubTile
} from '$lib/pilotHome';
import { resolvePilotId } from '$lib/server/pilot';
import { loadOpenRunState } from '$lib/server/fieldRunState';
import { resolveTargetDisplayName } from '$lib/server/targetResource';
import type { Actions, PageServerLoad } from './$types';

function getDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'DATABASE_URL is not configured');
	}
	return createDb(databaseUrl);
}

function partSnapshotForCondition(input: {
	id: string;
	schematicId: string;
	displayName: string;
	condition: number;
	integrity: number;
	propertyScores: Record<string, number>;
	slot: ThumperPartSnapshot['slot'];
}): ThumperPartSnapshot {
	return {
		slot: input.slot,
		itemId: input.id,
		schematicId: input.schematicId,
		displayName: input.displayName,
		propertyScores: input.propertyScores,
		condition: input.condition,
		integrity: input.integrity
	};
}

function familyCountsFromInventory(
	inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>
): Record<ResourceFamily, number> {
	const counts: Record<ResourceFamily, number> = {
		conductive_metal: 0,
		structural_alloy: 0,
		reactive_crystal: 0
	};

	for (const stack of inventory) {
		counts[stack.family as ResourceFamily] += stack.quantity;
	}

	return counts;
}

async function assembleHubTiles(
	db: ReturnType<typeof getDb>,
	input: {
		pilotId: string;
		needsFrameChoice: boolean;
		activeBloomId: number;
		inventory: Awaited<ReturnType<typeof listPilotResourceStacksWithInstances>>;
		equippedThumperParts: Awaited<ReturnType<typeof loadEquippedThumperPartsSummary>>;
		openRun: { targetDisplayName: string; recalled: boolean } | null;
		thumperDemo: { status: string; secondsRemaining: number } | null;
		runReadyToResolve: boolean;
	}
): Promise<HubTile[]> {
	const now = new Date();
	const [prospectingProgress, repairKitCount, familyScanFlags] = await Promise.all([
		input.needsFrameChoice
			? Promise.resolve({
					surveyEnergy: SURVEY_ENERGY_CAP,
					lastEnergyUpdatedAtMs: now.getTime(),
					sampledSpotIds: [] as string[]
				})
			: getPilotProspectingProgress(db, input.pilotId, now, input.activeBloomId),
		input.needsFrameChoice ? Promise.resolve(0) : countFieldRepairKitsForPilot(db, input.pilotId),
		input.needsFrameChoice
			? Promise.resolve([false, false, false])
			: Promise.all(
					(['conductive_metal', 'structural_alloy', 'reactive_crystal'] as const).map((family) =>
						hasPilotFamilyScan(db, {
							pilotId: input.pilotId,
							bloomId: input.activeBloomId,
							family
						})
					)
				)
	]);

	let overallCondition = null;
	if (!input.needsFrameChoice) {
		const equippedRaw = await getEquippedThumperPartsForPilot(db, input.pilotId);
		overallCondition = overallThumperCondition({
			drill: equippedRaw.drill
				? partSnapshotForCondition({ ...equippedRaw.drill, slot: 'drill' })
				: undefined,
			pump: equippedRaw.pump
				? partSnapshotForCondition({ ...equippedRaw.pump, slot: 'pump' })
				: undefined,
			hull: equippedRaw.hull
				? partSnapshotForCondition({ ...equippedRaw.hull, slot: 'hull' })
				: undefined
		});
	}

	const workbenchSummaries = MVP_CRAFT_SCHEMATICS.map((schematic) => {
		const readiness = analyzeSchematicReadiness({
			schematic,
			ownedStacks: input.inventory.map((stack) => ({
				resourceInstanceId: stack.resourceInstanceId,
				resourceSlug: stack.resourceSlug,
				displayName: stack.displayName,
				family: stack.family as ResourceFamily,
				quantity: stack.quantity
			}))
		});

		return {
			schematicId: schematic.id,
			displayName: schematic.displayName,
			craftableNow: readiness.craftableNow,
			firstBlocker: readiness.blockers[0] ?? null
		};
	});

	return buildHubTiles({
		needsFrameChoice: input.needsFrameChoice,
		openRun: input.openRun,
		thumperDemo: input.thumperDemo,
		runReadyToResolve: input.runReadyToResolve,
		equippedThumperParts: input.equippedThumperParts,
		overallThumperCondition: overallCondition,
		surveyEnergy: prospectingProgress.surveyEnergy,
		surveyEnergyCap: SURVEY_ENERGY_CAP,
		surveyEnergyOutlook: surveyEnergyOutlook({
			storedEnergy: prospectingProgress.surveyEnergy,
			lastUpdatedAtMs: prospectingProgress.lastEnergyUpdatedAtMs,
			nowMs: now.getTime()
		}),
		sampledSpotCount: prospectingProgress.sampledSpotIds.length,
		hasFamilyScan: familyScanFlags.some(Boolean),
		workbenchSummaries,
		familyCounts: familyCountsFromInventory(input.inventory),
		repairKitCount
	});
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
		frameLabel: '',
		frameVerb: '',
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
	await ensurePilotGameReady(db, pilotId);

	const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
		db,
		pilotId,
		TUTORIAL_RUN_SEED
	);

	const surveyContext = await loadScannerContext(db, pilotId);
	const inventory = await listPilotResourceStacksWithInstances(db, pilotId);
	const equippedThumperParts = await loadEquippedThumperPartsSummary(db, pilotId);
	const run = await getOpenThumperRunForPilot(db, pilotId);

	const pilotHomeBase = {
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
		const hubTiles = await assembleHubTiles(db, {
			pilotId,
			needsFrameChoice: false,
			activeBloomId: surveyContext.activeBloomId,
			inventory,
			equippedThumperParts,
			openRun: null,
			thumperDemo: null,
			runReadyToResolve: false
		});

		return {
			...pilotHome,
			hubTiles,
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
	const hubTiles = await assembleHubTiles(db, {
		pilotId,
		needsFrameChoice: false,
		activeBloomId: surveyContext.activeBloomId,
		inventory,
		equippedThumperParts,
		openRun: state.openRun,
		thumperDemo: state.thumperDemo,
		runReadyToResolve: state.runReadyToResolve
	});

	return {
		...pilotHome,
		hubTiles,
		hasCompletedTutorial,
		activeBloomId: surveyContext.activeBloomId,
		...state
	};
};

export const actions: Actions = {
	rotateBloom: async (event) => {
		if (!dev) {
			return fail(403, { message: 'Rotate bloom is only available in dev builds' });
		}

		const db = getDb();
		const pilotId = resolvePilotId(event);
		await ensureSessionPilot(db, pilotId);
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
