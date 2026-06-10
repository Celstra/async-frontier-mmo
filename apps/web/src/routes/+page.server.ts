import {
	BLOOM_ONE_ID,
	claimOpenThumperRunForPilot,
	getActiveBloomId,
	getResourceInstanceByBloomSlug,
	rotateActiveBloom,
	countFieldRepairKitsForPilot,
	craftFieldRepairKitForPilot,
	craftSchematicForPilot,
	craftSurveyScannerForPilot,
	createDb,
	ensurePilotGameReady,
	ensureSessionPilot,
	equipScannerItemForPilot,
	getEquippedScannerForPilot,
	getLatestThumperRunForPilot,
	listScannerItemsForPilot,
	getOpenThumperRunForPilot,
	getPilotById,
	getPilotFrame,
	pilotNeedsFrameChoice,
	setPilotFrame,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	hasPilotCompletedTutorialThumper,
	listPilotResourceStacksWithInstances,
	applyRunWearToPartItems,
	getEquippedThumperPartsForPilot,
	getThumperRunPartSnapshots,
	listThumperPartItemsForPilot,
	partModifiersFromRunSnapshots,
	equipThumperPartForPilot
} from '@async-frontier-mmo/db';
import {
	assertVeyrithTutorialWindowsReady,
	BASIC_DRILL_HEAD,
	DEFAULT_PROJECTED_RECOVERY,
	deemphasizedStatsForSlotFamily,
	EFFICIENT_PUMP,
	FIELD_REPAIR_KIT,
	MVP_CRAFT_SCHEMATICS,
	FIRST_REPAIR_KIT_SUGGESTED_TUNING,
	FIRST_SCANNER_SUGGESTED_TUNING,
	FIRST_SESSION_SCANNER_MINIMUM,
	PUSH_RUN_PROJECTED_RECOVERY,
	projectedRecoveryForStoredRun,
	REINFORCED_HULL_PLATE,
	thumperPartSlotForSchematic,
	getRedMesaResource,
	isThumperRunClaimable,
	isThumperRunReadyToResolve,
	SURVEY_SCANNER_MK_I,
	TUTORIAL_RUN_SEED,
	RED_MESA_BLOOM_RESOURCES,
	resolveFirstSessionThumperRunResult,
	resolveThumperRunResult,
	type CraftMode,
	type NamedResourceId,
	type SchematicDefinition,
	type TuningAllocation,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse,
	resolveThumperState
} from '@async-frontier-mmo/domain';
import { parseFrameId, isFrameId } from 'shared';
import { dev } from '$app/environment';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
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

async function requireFrameChosenPilot(db: ReturnType<typeof getDb>, pilotId: string) {
	await ensureSessionPilot(db, pilotId);
	const pilot = await getPilotById(db, pilotId);
	if (!pilot || pilotNeedsFrameChoice(pilot)) {
		return fail(400, { message: 'Choose a frame before continuing' });
	}
	await ensurePilotGameReady(db, pilotId);
	return null;
}

async function buildTutorialClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
	run: {
		id: string;
		targetResourceId: string;
		pilotFrameId: string;
		isPushRun: boolean;
		trueConcentrationPercent: number | null;
		extractionTailMinutes: number;
	},
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as 'signal_drift' | 'pump_strain',
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	const partSnapshots = await getThumperRunPartSnapshots(tx, run.id);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);
	const projectedRecovery = projectedRecoveryForStoredRun({
		isPushRun: run.isPushRun,
		trueConcentrationPercent: run.trueConcentrationPercent,
		extractionTailMinutes: run.extractionTailMinutes,
		partModifiers,
		recoveryFloor: FIRST_SESSION_SCANNER_MINIMUM
	});

	return resolveFirstSessionThumperRunResult({
		targetResourceId: run.targetResourceId as NamedResourceId,
		pilotFrame: parseFrameId(run.pilotFrameId),
		appliedWear: 0,
		partModifiers,
		projectedRecovery,
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as 'signal_drift' | 'pump_strain',
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses
	});
}

async function buildSeededClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
	run: {
		id: string;
		targetResourceId: string;
		pilotFrameId: string;
		runSeed: string;
		isPushRun: boolean;
		trueConcentrationPercent: number | null;
		extractionTailMinutes: number;
	},
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	const partSnapshots = await getThumperRunPartSnapshots(tx, run.id);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);
	const projectedRecovery = projectedRecoveryForStoredRun({
		isPushRun: run.isPushRun,
		trueConcentrationPercent: run.trueConcentrationPercent,
		extractionTailMinutes: run.extractionTailMinutes,
		partModifiers
	});

	return resolveThumperRunResult({
		runConfig: {
			targetResourceId: run.targetResourceId as NamedResourceId,
			projectedRecovery,
			runSeed: run.runSeed,
			appliedWear: 0,
			partModifiers
		},
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses,
		pilotFrame: parseFrameId(run.pilotFrameId)
	});
}

function parseCraftMode(value: FormDataEntryValue | null): CraftMode | null {
	if (value === 'safe_craft' || value === 'careful_experiment') {
		return value;
	}
	return null;
}

function parseTuningAllocation(formData: FormData): TuningAllocation | null {
	const tuning: TuningAllocation = {
		survey_clarity: Number.parseInt(String(formData.get('tuning_survey_clarity')), 10),
		stat_hint_accuracy: Number.parseInt(String(formData.get('tuning_stat_hint_accuracy')), 10),
		signal_range: Number.parseInt(String(formData.get('tuning_signal_range')), 10)
	};

	for (const points of Object.values(tuning)) {
		if (!Number.isInteger(points) || points < 0) {
			return null;
		}
	}

	const total = Object.values(tuning).reduce((sum, points) => sum + points, 0);
	if (total !== 3) {
		return null;
	}

	return tuning;
}

function parseTuningForSchematic(
	formData: FormData,
	schematic: SchematicDefinition
): TuningAllocation | null {
	const tuning: TuningAllocation = {};

	for (const property of schematic.properties) {
		const points = Number.parseInt(String(formData.get(`tuning_${property.id}`)), 10);
		if (!Number.isInteger(points) || points < 0) {
			return null;
		}
		tuning[property.id] = points;
	}

	const total = Object.values(tuning).reduce((sum, points) => sum + points, 0);
	if (total !== 3) {
		return null;
	}

	return tuning;
}

function parseRepairKitTuningAllocation(formData: FormData): TuningAllocation | null {
	return parseTuningForSchematic(formData, FIELD_REPAIR_KIT);
}

function schematicToCraftUi(schematic: SchematicDefinition) {
	return {
		id: schematic.id,
		displayName: schematic.displayName,
		slots: schematic.slots,
		properties: schematic.properties.map((property) => ({
			id: property.id,
			displayName: property.displayName
		}))
	};
}

const PUMP_SUGGESTED_TUNING: TuningAllocation = {
	recovery_efficiency: 2,
	clog_resistance: 1,
	field_stability: 0
};

const DRILL_SUGGESTED_TUNING: TuningAllocation = {
	extraction_rate: 2,
	depth_access: 1,
	wear_control: 0
};

const HULL_SUGGESTED_TUNING: TuningAllocation = {
	max_condition: 2,
	damage_reduction: 1,
	repairability: 0
};

const THUMPER_PART_SCHEMATIC_IDS = new Set([
	BASIC_DRILL_HEAD.id,
	EFFICIENT_PUMP.id,
	REINFORCED_HULL_PLATE.id
]);

const THUMPER_PART_SUGGESTED_TUNING: Record<string, TuningAllocation> = {
	[EFFICIENT_PUMP.id]: PUMP_SUGGESTED_TUNING,
	[BASIC_DRILL_HEAD.id]: DRILL_SUGGESTED_TUNING,
	[REINFORCED_HULL_PLATE.id]: HULL_SUGGESTED_TUNING
};

function parseSlotInstanceId(
	formData: FormData,
	slotId: string
): string | null {
	const value = formData.get(`slot_${slotId}`);
	return typeof value === 'string' && value.length > 0 ? value : null;
}

async function loadThumperPartsContext(db: ReturnType<typeof getDb>, pilotId: string) {
	const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
	const inventory = await listThumperPartItemsForPilot(db, pilotId);

	return {
		equippedThumperParts: {
			drill: equipped.drill
				? {
						itemId: equipped.drill.id,
						displayName: equipped.drill.displayName,
						condition: equipped.drill.condition,
						integrity: equipped.drill.integrity
					}
				: null,
			pump: equipped.pump
				? {
						itemId: equipped.pump.id,
						displayName: equipped.pump.displayName,
						condition: equipped.pump.condition,
						integrity: equipped.pump.integrity,
						recoveryEfficiency: equipped.pump.propertyScores.recovery_efficiency ?? 0
					}
				: null,
			hull: equipped.hull
				? {
						itemId: equipped.hull.id,
						displayName: equipped.hull.displayName,
						condition: equipped.hull.condition,
						integrity: equipped.hull.integrity
					}
				: null
		},
		thumperPartItems: inventory.map((item) => ({
			id: item.id,
			displayName: item.displayName,
			schematicId: item.schematicId,
			slot: thumperPartSlotForSchematic(item.schematicId),
			condition: item.condition,
			integrity: item.integrity,
			recoveryEfficiency: item.propertyScores.recovery_efficiency ?? null
		}))
	};
}

async function loadScannerContext(db: ReturnType<typeof getDb>, pilotId: string) {
	const equippedScanner = await getEquippedScannerForPilot(db, pilotId);
	const surveyClarityScore = equippedScanner?.propertyScores.survey_clarity ?? 0;
	const activeBloomId = await getActiveBloomId(db);
	const scannerItems = await listScannerItemsForPilot(db, pilotId);

	return {
		activeBloomId,
		scannerItems: scannerItems.map((item) => ({
			id: item.id,
			displayName: item.displayName,
			surveyClarity: item.propertyScores.survey_clarity ?? 0,
			equipped: equippedScanner?.id === item.id
		})),
		equippedScanner: equippedScanner
			? {
					itemId: equippedScanner.id,
					displayName: equippedScanner.displayName,
					surveyClarityScore
				}
			: null
	};
}

async function loadCraftContext(db: ReturnType<typeof getDb>, pilotId: string) {
	const inventory = await listPilotResourceStacksWithInstances(db, pilotId);

	const scannerSchematic = {
		id: SURVEY_SCANNER_MK_I.id,
		displayName: SURVEY_SCANNER_MK_I.displayName,
		slots: SURVEY_SCANNER_MK_I.slots,
		properties: SURVEY_SCANNER_MK_I.properties.map((property) => ({
			id: property.id,
			displayName: property.displayName
		}))
	};
	const repairKitSchematic = {
		id: FIELD_REPAIR_KIT.id,
		displayName: FIELD_REPAIR_KIT.displayName,
		slots: FIELD_REPAIR_KIT.slots,
		properties: FIELD_REPAIR_KIT.properties.map((property) => ({
			id: property.id,
			displayName: property.displayName
		}))
	};

	return {
		schematic: scannerSchematic,
		scannerSchematic,
		repairKitSchematic,
		thumperPartSchematics: [
			schematicToCraftUi(EFFICIENT_PUMP),
			schematicToCraftUi(BASIC_DRILL_HEAD),
			schematicToCraftUi(REINFORCED_HULL_PLATE)
		],
		suggestedTuning: FIRST_SCANNER_SUGGESTED_TUNING,
		scannerSuggestedTuning: FIRST_SCANNER_SUGGESTED_TUNING,
		repairKitSuggestedTuning: FIRST_REPAIR_KIT_SUGGESTED_TUNING,
		thumperPartSuggestedTuning: THUMPER_PART_SUGGESTED_TUNING,
		deemphasizedStatsByFamily: {
			conductive_metal: deemphasizedStatsForSlotFamily(
				MVP_CRAFT_SCHEMATICS,
				'conductive_metal'
			),
			structural_alloy: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'structural_alloy'),
			reactive_crystal: deemphasizedStatsForSlotFamily(MVP_CRAFT_SCHEMATICS, 'reactive_crystal')
		},
		inventory
	};
}

async function claimOpenRun(db: ReturnType<typeof getDb>, pilotId: string, now: Date) {
	const activeBloomId = await getActiveBloomId(db);

	return claimOpenThumperRunForPilot(db, {
		pilotId,
		now,
		isClaimable: (run, windows) => isThumperRunClaimable({ run, windows, now }),
		isResolvableRun: () => true,
		validateWindows: (run, windows) => {
			if (run.runSeed === TUTORIAL_RUN_SEED) {
				assertVeyrithTutorialWindowsReady(windows);
			}
		},
		buildResult: (tx, run, windows) =>
			run.runSeed === TUTORIAL_RUN_SEED
				? buildTutorialClaimResult(tx, run, windows)
				: buildSeededClaimResult(tx, run, windows),
		afterResultInserted: async (tx, { run, windows }) => {
			const snapshots = await getThumperRunPartSnapshots(tx, run.id);
			const responses = windows
				.filter((window) => window.chosenResponse !== null)
				.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication,
					chosenResponse: window.chosenResponse!
				}));
			await applyRunWearToPartItems(tx, {
				pilotId: run.pilotId,
				thumperRunId: run.id,
				snapshots,
				responses,
				isPushRun: run.isPushRun
			});
		},
		grantResourceReward: { bloomId: activeBloomId }
	});
}

async function loadPilotHomeContext(
	db: ReturnType<typeof getDb>,
	pilotId: string,
	input: {
		pilotFrame: ReturnType<typeof parseFrameId>;
		needsFrameChoice: boolean;
		activeBloomId: number;
		inventory: Awaited<ReturnType<typeof loadCraftContext>>['inventory'];
		equippedScanner: Awaited<ReturnType<typeof loadScannerContext>>['equippedScanner'];
		scannerItems: Awaited<ReturnType<typeof loadScannerContext>>['scannerItems'];
		equippedThumperParts: Awaited<ReturnType<typeof loadThumperPartsContext>>['equippedThumperParts'];
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
			...(await loadPilotHomeContext(db, pilotId, {
				pilotFrame,
				needsFrameChoice: true,
				activeBloomId: BLOOM_ONE_ID,
				inventory: [],
				equippedScanner: null,
				scannerItems: [],
				equippedThumperParts: {
					drill: null,
					pump: null,
					hull: null
				},
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
			fieldRepairKitCount: 0,
			hasCompletedTutorial: false,
			craftContext: null,
			equippedThumperParts: null,
			thumperPartItems: [],
			tutorialSurvey: null,
			activeBloomSurvey: null,
			surveyMode: 'tutorial' as const,
			activeBloomId: BLOOM_ONE_ID,
			scannerItems: [],
			equippedScanner: null
		};
	}

	const surveyContext = await loadScannerContext(db, pilotId);
	const thumperPartsContext = await loadThumperPartsContext(db, pilotId);
	const craftContext = await loadCraftContext(db, pilotId);
	const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);
	const run = await getOpenThumperRunForPilot(db, pilotId);

	const pilotHomeBase = {
		pilotFrame,
		needsFrameChoice: false,
		activeBloomId: surveyContext.activeBloomId,
		inventory: craftContext.inventory,
		equippedScanner: surveyContext.equippedScanner,
		scannerItems: surveyContext.scannerItems,
		equippedThumperParts: thumperPartsContext.equippedThumperParts,
		hasCompletedTutorial
	};

	if (!run) {
		const pilotHome = await loadPilotHomeContext(db, pilotId, {
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
			fieldRepairKitCount,
			hasCompletedTutorial,
			craftContext,
			...thumperPartsContext,
			...surveyContext
		};
	}

	const state = await loadOpenRunState(db, run, fieldRepairKitCount, {
		resolveDisplayName: resolveTargetDisplayName
	});
	const pilotHome = await loadPilotHomeContext(db, pilotId, {
		...pilotHomeBase,
		openRun: state.openRun,
		thumperDemo: state.thumperDemo,
		runReadyToResolve: state.runReadyToResolve,
		eventWindows: state.eventWindows
	});

	return {
		...pilotHome,
		hasCompletedTutorial,
		craftContext,
		...thumperPartsContext,
		...surveyContext,
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

	claim: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		const now = new Date();

		let outcome;
		try {
			outcome = await claimOpenRun(db, pilotId, now);
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Claim failed unexpectedly'
			});
		}

		if (outcome.status === 'claimed' || outcome.status === 'already_claimed') {
			return {
				thumperDemo: null,
				claimed: true,
				claimResult: outcome.claimResult,
				reward: outcome.status === 'claimed' ? outcome.reward : null
			};
		}

		if (outcome.status === 'not_claimable') {
			const run = await getOpenThumperRunForPilot(db, pilotId);
			const thumperDemo = run
				? resolveThumperState({
						deployedAt: run.deployedAt,
						durationSeconds: run.durationSeconds,
						now
					})
				: null;
			return fail(400, { message: 'Thumper is not claimable yet', thumperDemo });
		}

		if (outcome.status === 'not_resolvable') {
			return fail(400, { message: outcome.message });
		}

		if (outcome.status === 'invalid_windows') {
			return fail(400, { message: outcome.message });
		}

		const latest = await getLatestThumperRunForPilot(db, pilotId);
		if (latest?.claimedAt) {
			const existingResult = await getThumperRunResultForRun(db, latest.id);
			return { thumperDemo: null, claimed: true, claimResult: existingResult };
		}

		return fail(400, { message: 'No thumper to claim' });
	},

	craftScanner: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const idempotencyKey = formData.get('idempotencyKey');
		const craftMode = parseCraftMode(formData.get('craftMode'));
		const tuning = parseTuningAllocation(formData);

		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing craft idempotency key' });
		}
		if (!craftMode) {
			return fail(400, { message: 'Invalid craft mode' });
		}
		if (!tuning) {
			return fail(400, { message: 'Allocate exactly 3 tuning points' });
		}

		const slotInputs = SURVEY_SCANNER_MK_I.slots.map((slot) => {
			const resourceInstanceId = parseSlotInstanceId(formData, slot.id);
			if (!resourceInstanceId) {
				return null;
			}
			return { slotId: slot.id, resourceInstanceId };
		});

		if (slotInputs.some((slot) => slot === null)) {
			return fail(400, { message: 'Every schematic slot must be filled' });
		}

		const outcome = await craftSurveyScannerForPilot(db, {
			pilotId,
			idempotencyKey,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey
		});

		if (outcome.status === 'invalid_craft') {
			return fail(400, { message: outcome.reason });
		}

		const craftContext = await loadCraftContext(db, pilotId);
		const thumperPartsContext = await loadThumperPartsContext(db, pilotId);

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			craftContext,
			...thumperPartsContext
		};
	},

	craftThumperPart: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const schematicId = formData.get('schematicId');
		const idempotencyKey = formData.get('idempotencyKey');
		const craftMode = parseCraftMode(formData.get('craftMode'));

		if (typeof schematicId !== 'string' || !THUMPER_PART_SCHEMATIC_IDS.has(schematicId)) {
			return fail(400, { message: 'Invalid thumper part schematic' });
		}

		const schematic =
			schematicId === BASIC_DRILL_HEAD.id
				? BASIC_DRILL_HEAD
				: schematicId === EFFICIENT_PUMP.id
					? EFFICIENT_PUMP
					: REINFORCED_HULL_PLATE;

		const tuning = parseTuningForSchematic(formData, schematic);

		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing craft idempotency key' });
		}
		if (!craftMode) {
			return fail(400, { message: 'Invalid craft mode' });
		}
		if (!tuning) {
			return fail(400, { message: 'Allocate exactly 3 tuning points' });
		}

		const slotInputs = schematic.slots.map((slot) => {
			const resourceInstanceId = parseSlotInstanceId(formData, slot.id);
			if (!resourceInstanceId) {
				return null;
			}
			return { slotId: slot.id, resourceInstanceId };
		});

		if (slotInputs.some((slot) => slot === null)) {
			return fail(400, { message: 'Every schematic slot must be filled' });
		}

		const outcome = await craftSchematicForPilot(db, {
			pilotId,
			idempotencyKey,
			schematic,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey
		});

		if (outcome.status === 'invalid_craft') {
			return fail(400, { message: outcome.reason });
		}

		const craftContext = await loadCraftContext(db, pilotId);
		const thumperPartsContext = await loadThumperPartsContext(db, pilotId);

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			craftContext,
			...thumperPartsContext
		};
	},

	craftRepairKit: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const idempotencyKey = formData.get('idempotencyKey');
		const craftMode = parseCraftMode(formData.get('craftMode'));
		const tuning = parseRepairKitTuningAllocation(formData);

		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing craft idempotency key' });
		}
		if (!craftMode) {
			return fail(400, { message: 'Invalid craft mode' });
		}
		if (!tuning) {
			return fail(400, { message: 'Allocate exactly 3 tuning points for repair kit' });
		}

		const slotInputs = FIELD_REPAIR_KIT.slots.map((slot) => {
			const resourceInstanceId = parseSlotInstanceId(formData, slot.id);
			if (!resourceInstanceId) {
				return null;
			}
			return { slotId: slot.id, resourceInstanceId };
		});

		if (slotInputs.some((slot) => slot === null)) {
			return fail(400, { message: 'Every schematic slot must be filled' });
		}

		const outcome = await craftFieldRepairKitForPilot(db, {
			pilotId,
			idempotencyKey,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey
		});

		if (outcome.status === 'invalid_craft') {
			return fail(400, { message: outcome.reason });
		}

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);
		const craftContext = await loadCraftContext(db, pilotId);
		const thumperPartsContext = await loadThumperPartsContext(db, pilotId);

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			fieldRepairKitCount,
			craftContext,
			...thumperPartsContext
		};
	},

	rotateBloom: async (event) => {
		if (!dev) {
			return fail(403, { message: 'Rotate bloom is only available in dev builds' });
		}

		const db = getDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

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

		const craftContext = await loadCraftContext(db, pilotId);

		return {
			hasCompletedTutorial,
			bloomRotation: outcome,
			craftContext
		};
	},

	equipThumperPart: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const slot = formData.get('slot');
		const itemId = formData.get('itemId');

		if (slot !== 'drill' && slot !== 'pump' && slot !== 'hull') {
			return fail(400, { message: 'Invalid thumper part slot' });
		}

		const outcome = await equipThumperPartForPilot(db, {
			pilotId,
			slot,
			itemId: typeof itemId === 'string' && itemId.length > 0 ? itemId : null
		});

		if (outcome.status === 'invalid') {
			return fail(400, { message: outcome.reason });
		}

		const thumperPartsContext = await loadThumperPartsContext(db, pilotId);

		return {
			equipThumperOutcome:
				outcome.status === 'equipped'
					? {
							slot: outcome.slot,
							displayName: outcome.item.displayName,
							condition: outcome.item.condition,
							integrity: outcome.item.integrity
						}
					: { slot: outcome.slot, action: 'unequipped' as const },
			...thumperPartsContext,
			...thumperPartsContext
		};
	},

	equipScanner: async (event) => {
		const db = getDb();
		const pilotId = resolvePilotId(event);
		const frameGate = await requireFrameChosenPilot(db, pilotId);
		if (frameGate) return frameGate;

		const formData = await event.request.formData();
		const itemId = formData.get('itemId');
		if (typeof itemId !== 'string' || itemId.length === 0) {
			return fail(400, { message: 'Missing scanner item' });
		}

		const outcome = await equipScannerItemForPilot(db, {
			pilotId,
			itemId
		});

		if (outcome.status === 'invalid') {
			return fail(400, { message: outcome.reason });
		}

		const thumperPartsContext = await loadThumperPartsContext(db, pilotId);

		return {
			equipOutcome: {
				itemId: outcome.item.id,
				displayName: outcome.item.displayName,
				surveyClarity: outcome.item.propertyScores.survey_clarity ?? 0
			},
			...(await loadScannerContext(db, pilotId)),
			...thumperPartsContext
		};
	}
};
