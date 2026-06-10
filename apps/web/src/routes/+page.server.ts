import {
	BLOOM_ONE_ID,
	claimOpenThumperRunForPilot,
	countFieldRepairKitsForPilot,
	craftFieldRepairKitForPilot,
	craftSchematicForPilot,
	craftSurveyScannerForPilot,
	createDb,
	deployThumperRunWithEventWindows,
	ensureDemoPilotReady,
	equipScannerItemForPilot,
	getEquippedScannerForPilot,
	getLatestThumperRunForPilot,
	listScannerItemsForPilot,
	getOpenThumperRunForPilot,
	getPilotFrame,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	hasPilotCompletedTutorialThumper,
	listPilotResourceStacksWithInstances,
	recordThumperEventWindowResponseForPilot,
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
	EFFICIENT_PUMP,
	FIELD_REPAIR_KIT,
	FIRST_REPAIR_KIT_SUGGESTED_TUNING,
	FIRST_SCANNER_SUGGESTED_TUNING,
	REINFORCED_HULL_PLATE,
	thumperPartSlotForSchematic,
	generateThumperEventWindows,
	getEventWindowResponseOptions,
	getRedMesaResource,
	isThumperRunClaimable,
	isThumperRunReadyToResolve,
	isTutorialThumperDeploy,
	SURVEY_SCANNER_MK_I,
	TUTORIAL_RUN_SEED,
	RED_MESA_BLOOM_RESOURCES,
	resolveFirstSessionThumperRunResult,
	surveyRedMesaFirstSession,
	THUMPER_EVENT_ACTIONS,
	validateEventWindowRespondOrder,
	validateEventWindowResponse,
	type CraftMode,
	type NamedResourceId,
	type SchematicDefinition,
	type TuningAllocation,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse,
	resolveThumperState
} from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID, parseFrameId } from 'shared';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

const SEEDED_RUN_NOT_RESOLVABLE_MESSAGE =
	'Seeded run claim resolution is not available yet. Complete the tutorial run first, or wait for the non-tutorial resolver lesson.';

function getDb() {
	const databaseUrl = env.DATABASE_URL;
	if (!databaseUrl) {
		error(500, 'DATABASE_URL is not configured');
	}
	return createDb(databaseUrl);
}

function parseTargetResourceId(value: FormDataEntryValue | null): NamedResourceId | null {
	if (typeof value !== 'string' || !(value in RED_MESA_BLOOM_RESOURCES)) {
		return null;
	}
	return value as NamedResourceId;
}

function parseWindowIndex(value: FormDataEntryValue | null): number | null {
	if (typeof value !== 'string') {
		return null;
	}
	const index = Number.parseInt(value, 10);
	return Number.isInteger(index) && index > 0 ? index : null;
}

function parseChosenResponse(value: FormDataEntryValue | null): ThumperWindowChosenResponse | null {
	if (value === 'hold' || value === 'recall_early') {
		return value;
	}
	if (typeof value === 'string' && THUMPER_EVENT_ACTIONS.includes(value as ThumperEventActionId)) {
		return value as ThumperEventActionId;
	}
	return null;
}

function isRunEndedByRecall(
	windows: ReadonlyArray<{ chosenResponse: string | null }>
): boolean {
	return windows.some((window) => window.chosenResponse === 'recall_early');
}

function mapEventWindowsForUi(
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
	fieldRepairKitCount: number
) {
	return windows.map((window) => ({
		windowIndex: window.windowIndex,
		complication: window.complication,
		matchingAction: window.matchingAction,
		chosenResponse: window.chosenResponse,
		responded: window.chosenResponse !== null,
		responseOptions: getEventWindowResponseOptions({
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId,
			fieldRepairKitCount
		})
	}));
}

async function loadOpenRunState(
	db: ReturnType<typeof getDb>,
	run: NonNullable<Awaited<ReturnType<typeof getOpenThumperRunForPilot>>>,
	fieldRepairKitCount: number
) {
	const now = new Date();
	const thumperDemo = resolveThumperState({
		deployedAt: run.deployedAt,
		durationSeconds: run.durationSeconds,
		now
	});
	const target = getRedMesaResource(run.targetResourceId as NamedResourceId);
	const eventWindows = await getThumperEventWindowsForRun(db, run.id);
	const recalled = isRunEndedByRecall(eventWindows);

	return {
		thumperDemo,
		loadedAt: now.toISOString(),
		openRun: {
			id: run.id,
			targetResourceId: run.targetResourceId,
			targetDisplayName: target.displayName,
			pilotFrameId: parseFrameId(run.pilotFrameId),
			runSeed: run.runSeed,
			isPushRun: run.isPushRun,
			claimResolutionAvailable: run.runSeed === TUTORIAL_RUN_SEED,
			recalled
		},
		eventWindows: mapEventWindowsForUi(eventWindows, fieldRepairKitCount),
		runHullCondition: run.runHullCondition,
		runHullIntegrity: run.runHullIntegrity,
		fieldRepairKitCount,
		runReadyToResolve: isThumperRunReadyToResolve(eventWindows)
	};
}

async function buildTutorialClaimResult(
	tx: Parameters<typeof getThumperRunPartSnapshots>[0],
	run: { id: string; targetResourceId: string; pilotFrameId: string },
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

	return resolveFirstSessionThumperRunResult({
		targetResourceId: run.targetResourceId as NamedResourceId,
		pilotFrame: parseFrameId(run.pilotFrameId),
		appliedWear: 0,
		partModifiers,
		eventWindows: windows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as 'signal_drift' | 'pump_strain',
			matchingAction: window.matchingAction as ThumperEventActionId
		})),
		responses
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

async function loadSurveyContext(db: ReturnType<typeof getDb>, pilotId: string) {
	const equippedScanner = await getEquippedScannerForPilot(db, pilotId);
	const surveyClarityScore = equippedScanner?.propertyScores.survey_clarity ?? 0;
	const survey = surveyRedMesaFirstSession(
		surveyClarityScore > 0 ? { surveyClarityScore } : undefined
	);
	const scannerItems = await listScannerItemsForPilot(db, pilotId);

	return {
		survey,
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
		inventory
	};
}

async function claimTutorialRun(db: ReturnType<typeof getDb>, now: Date) {
	return claimOpenThumperRunForPilot(db, {
		pilotId: DEMO_PILOT_ID,
		now,
		isClaimable: (run, windows) => isThumperRunClaimable({ run, windows, now }),
		isResolvableRun: (run) => run.runSeed === TUTORIAL_RUN_SEED,
		notResolvableMessage: SEEDED_RUN_NOT_RESOLVABLE_MESSAGE,
		validateWindows: (run, windows) => {
			if (run.runSeed === TUTORIAL_RUN_SEED) {
				assertVeyrithTutorialWindowsReady(windows);
			}
		},
		buildResult: (tx, run, windows) => buildTutorialClaimResult(tx, run, windows),
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
		grantResourceReward: { bloomId: BLOOM_ONE_ID }
	});
}

export const load: PageServerLoad = async () => {
	const db = getDb();
	await ensureDemoPilotReady(db);
	const pilotFrame = await getPilotFrame(db, DEMO_PILOT_ID);
	const surveyContext = await loadSurveyContext(db, DEMO_PILOT_ID);
	const thumperPartsContext = await loadThumperPartsContext(db, DEMO_PILOT_ID);
	const craftContext = await loadCraftContext(db, DEMO_PILOT_ID);
	const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
		db,
		DEMO_PILOT_ID,
		TUTORIAL_RUN_SEED
	);
	const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, DEMO_PILOT_ID);
	const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

	if (!run) {
		return {
			thumperDemo: null,
			loadedAt: null,
			openRun: null,
			eventWindows: [],
			runReadyToResolve: false,
			fieldRepairKitCount,
			pilotFrame,
			hasCompletedTutorial,
			craftContext,
			...thumperPartsContext,
			...surveyContext
		};
	}

	const state = await loadOpenRunState(db, run, fieldRepairKitCount);
	return {
		pilotFrame,
		hasCompletedTutorial,
		craftContext,
		...thumperPartsContext,
		...surveyContext,
		...state
	};
};

export const actions: Actions = {
	deploy: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilotReady(db);
		const pilotFrame = await getPilotFrame(db, DEMO_PILOT_ID);
		const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
			db,
			DEMO_PILOT_ID,
			TUTORIAL_RUN_SEED
		);
		const open = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

		if (open) {
			return fail(400, { message: 'Demo pilot already has an open thumper' });
		}

		const formData = await request.formData();
		const targetResourceId = parseTargetResourceId(formData.get('targetResourceId'));
		if (!targetResourceId) {
			return fail(400, { message: 'Invalid or missing target resource' });
		}

		const isTutorialRun = isTutorialThumperDeploy({ targetResourceId, hasCompletedTutorial });
		const isPushRun = !isTutorialRun && formData.get('isPushRun') === 'true';
		const runSeed = isTutorialRun ? TUTORIAL_RUN_SEED : crypto.randomUUID();
		const plan = generateThumperEventWindows({
			targetResourceId,
			runSeed,
			isPushRun,
			isTutorialRun
		});

		const deployedAt = new Date();
		const durationSeconds = 60;

		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: DEMO_PILOT_ID,
			pilotFrameId: pilotFrame,
			targetResourceId,
			runSeed: plan.runSeed,
			isPushRun: plan.isPushRun,
			deployedAt,
			durationSeconds,
			windows: plan.windows.map((window) => ({
				windowIndex: window.windowIndex,
				complication: window.complication,
				matchingAction: window.matchingAction
			}))
		});

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, DEMO_PILOT_ID);
		const state = await loadOpenRunState(db, run, fieldRepairKitCount);
		return { hasCompletedTutorial, ...state };
	},

	respond: async ({ request }) => {
		const db = getDb();
		const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

		if (!run) {
			return fail(400, { message: 'No open thumper run' });
		}

		const formData = await request.formData();
		const windowIndex = parseWindowIndex(formData.get('windowIndex'));
		const chosenResponse = parseChosenResponse(formData.get('chosenResponse'));

		if (windowIndex === null || chosenResponse === null) {
			return fail(400, { message: 'Invalid event window response' });
		}

		const windows = await getThumperEventWindowsForRun(db, run.id);
		const window = windows.find((row) => row.windowIndex === windowIndex);
		if (!window) {
			return fail(400, { message: 'Event window not found' });
		}

		if (isRunEndedByRecall(windows)) {
			return fail(400, { message: 'Run already ended with Recall Early' });
		}

		const orderValidation = validateEventWindowRespondOrder({
			windows,
			windowIndex,
			chosenResponse
		});
		if (!orderValidation.ok) {
			return fail(400, { message: orderValidation.reason });
		}

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, DEMO_PILOT_ID);
		const validation = validateEventWindowResponse({
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId,
			chosenResponse,
			fieldRepairKitCount
		});
		if (!validation.ok) {
			return fail(400, { message: validation.reason });
		}

		if (window.chosenResponse === null) {
			const outcome = await recordThumperEventWindowResponseForPilot(db, {
				pilotId: DEMO_PILOT_ID,
				thumperRunId: run.id,
				windowIndex,
				complication: window.complication,
				chosenResponse,
				runHullCondition: run.runHullCondition,
				runHullIntegrity: run.runHullIntegrity
			});
			if (outcome.status === 'no_repair_kit') {
				return fail(400, { message: 'Field Repair requires a crafted Field Repair Kit' });
			}
			if (outcome.status === 'not_recorded') {
				return fail(400, { message: 'Could not record event window response' });
			}
		}

		const refreshedRun = (await getOpenThumperRunForPilot(db, DEMO_PILOT_ID))!;
		const refreshedKitCount = await countFieldRepairKitsForPilot(db, DEMO_PILOT_ID);
		const state = await loadOpenRunState(db, refreshedRun, refreshedKitCount);
		return state;
	},

	claim: async () => {
		const db = getDb();
		const now = new Date();
		const outcome = await claimTutorialRun(db, now);

		if (outcome.status === 'claimed' || outcome.status === 'already_claimed') {
			return {
				thumperDemo: null,
				claimed: true,
				claimResult: outcome.claimResult,
				reward: outcome.status === 'claimed' ? outcome.reward : null
			};
		}

		if (outcome.status === 'not_claimable') {
			const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);
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

		const latest = await getLatestThumperRunForPilot(db, DEMO_PILOT_ID);
		if (latest?.claimedAt) {
			const existingResult = await getThumperRunResultForRun(db, latest.id);
			return { thumperDemo: null, claimed: true, claimResult: existingResult };
		}

		return fail(400, { message: 'No thumper to claim' });
	},

	craftScanner: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilotReady(db);

		const formData = await request.formData();
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
			pilotId: DEMO_PILOT_ID,
			idempotencyKey,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey
		});

		if (outcome.status === 'invalid_craft') {
			return fail(400, { message: outcome.reason });
		}

		const craftContext = await loadCraftContext(db, DEMO_PILOT_ID);
		const surveyContext = await loadSurveyContext(db, DEMO_PILOT_ID);
		const thumperPartsContext = await loadThumperPartsContext(db, DEMO_PILOT_ID);

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			craftContext,
			...surveyContext,
			...thumperPartsContext
		};
	},

	craftThumperPart: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilotReady(db);

		const formData = await request.formData();
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
			pilotId: DEMO_PILOT_ID,
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

		const craftContext = await loadCraftContext(db, DEMO_PILOT_ID);
		const thumperPartsContext = await loadThumperPartsContext(db, DEMO_PILOT_ID);

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

	craftRepairKit: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilotReady(db);

		const formData = await request.formData();
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
			pilotId: DEMO_PILOT_ID,
			idempotencyKey,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey
		});

		if (outcome.status === 'invalid_craft') {
			return fail(400, { message: outcome.reason });
		}

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, DEMO_PILOT_ID);
		const craftContext = await loadCraftContext(db, DEMO_PILOT_ID);
		const surveyContext = await loadSurveyContext(db, DEMO_PILOT_ID);
		const thumperPartsContext = await loadThumperPartsContext(db, DEMO_PILOT_ID);

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			fieldRepairKitCount,
			craftContext,
			...surveyContext,
			...thumperPartsContext
		};
	},

	equipThumperPart: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilotReady(db);

		const formData = await request.formData();
		const slot = formData.get('slot');
		const itemId = formData.get('itemId');

		if (slot !== 'drill' && slot !== 'pump' && slot !== 'hull') {
			return fail(400, { message: 'Invalid thumper part slot' });
		}

		const outcome = await equipThumperPartForPilot(db, {
			pilotId: DEMO_PILOT_ID,
			slot,
			itemId: typeof itemId === 'string' && itemId.length > 0 ? itemId : null
		});

		if (outcome.status === 'invalid') {
			return fail(400, { message: outcome.reason });
		}

		const thumperPartsContext = await loadThumperPartsContext(db, DEMO_PILOT_ID);

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
			...(await loadSurveyContext(db, DEMO_PILOT_ID))
		};
	},

	equipScanner: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilotReady(db);

		const formData = await request.formData();
		const itemId = formData.get('itemId');
		if (typeof itemId !== 'string' || itemId.length === 0) {
			return fail(400, { message: 'Missing scanner item' });
		}

		const outcome = await equipScannerItemForPilot(db, {
			pilotId: DEMO_PILOT_ID,
			itemId
		});

		if (outcome.status === 'invalid') {
			return fail(400, { message: outcome.reason });
		}

		const surveyContext = await loadSurveyContext(db, DEMO_PILOT_ID);

		return {
			equipOutcome: {
				itemId: outcome.item.id,
				displayName: outcome.item.displayName,
				surveyClarity: outcome.item.propertyScores.survey_clarity ?? 0
			},
			...surveyContext
		};
	}
};
