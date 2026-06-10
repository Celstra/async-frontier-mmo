import {
	BLOOM_ONE_ID,
	claimOpenThumperRunForPilot,
	craftSurveyScannerForPilot,
	createDb,
	deployThumperRunWithEventWindows,
	ensureDemoPilotReady,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getPilotFrame,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	hasPilotCompletedTutorialThumper,
	listPilotResourceStacksWithInstances,
	recordThumperEventWindowResponse
} from '@async-frontier-mmo/db';
import {
	assertVeyrithTutorialWindowsReady,
	FIRST_SCANNER_SUGGESTED_TUNING,
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
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse,
	type TuningAllocation,
	resolveThumperState
} from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID, parseFrameId } from 'shared';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

/** Until Lesson 6.2 inventory exists, demo pilot owns zero repair kits. */
const DEMO_FIELD_REPAIR_KIT_COUNT = 0;

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
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
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
			fieldRepairKitCount: DEMO_FIELD_REPAIR_KIT_COUNT
		})
	}));
}

async function loadOpenRunState(db: ReturnType<typeof getDb>, run: NonNullable<Awaited<ReturnType<typeof getOpenThumperRunForPilot>>>) {
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
		eventWindows: mapEventWindowsForUi(eventWindows),
		runReadyToResolve: isThumperRunReadyToResolve(eventWindows)
	};
}

function buildTutorialClaimResult(
	run: { targetResourceId: string; pilotFrameId: string },
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>
) {
	const responses = windows
		.filter((window) => window.chosenResponse !== null)
		.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication as 'signal_drift' | 'pump_strain',
			chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
		}));

	return resolveFirstSessionThumperRunResult({
		targetResourceId: run.targetResourceId as NamedResourceId,
		pilotFrame: parseFrameId(run.pilotFrameId),
		appliedWear: 0,
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

function parseSlotInstanceId(
	formData: FormData,
	slotId: string
): string | null {
	const value = formData.get(`slot_${slotId}`);
	return typeof value === 'string' && value.length > 0 ? value : null;
}

async function loadCraftContext(db: ReturnType<typeof getDb>, pilotId: string) {
	const inventory = await listPilotResourceStacksWithInstances(db, pilotId);

	return {
		schematic: {
			id: SURVEY_SCANNER_MK_I.id,
			displayName: SURVEY_SCANNER_MK_I.displayName,
			slots: SURVEY_SCANNER_MK_I.slots,
			properties: SURVEY_SCANNER_MK_I.properties.map((property) => ({
				id: property.id,
				displayName: property.displayName
			}))
		},
		suggestedTuning: FIRST_SCANNER_SUGGESTED_TUNING,
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
		buildResult: (run, windows) => buildTutorialClaimResult(run, windows),
		grantResourceReward: { bloomId: BLOOM_ONE_ID }
	});
}

export const load: PageServerLoad = async () => {
	const survey = surveyRedMesaFirstSession();
	const db = getDb();
	await ensureDemoPilotReady(db);
	const pilotFrame = await getPilotFrame(db, DEMO_PILOT_ID);
	const craftContext = await loadCraftContext(db, DEMO_PILOT_ID);
	const hasCompletedTutorial = await hasPilotCompletedTutorialThumper(
		db,
		DEMO_PILOT_ID,
		TUTORIAL_RUN_SEED
	);
	const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

	if (!run) {
		return {
			thumperDemo: null,
			loadedAt: null,
			survey,
			openRun: null,
			eventWindows: [],
			runReadyToResolve: false,
			pilotFrame,
			hasCompletedTutorial,
			craftContext
		};
	}

	const state = await loadOpenRunState(db, run);
	return { survey, pilotFrame, hasCompletedTutorial, craftContext, ...state };
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

		const state = await loadOpenRunState(db, run);
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

		const validation = validateEventWindowResponse({
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId,
			chosenResponse,
			fieldRepairKitCount: DEMO_FIELD_REPAIR_KIT_COUNT
		});
		if (!validation.ok) {
			return fail(400, { message: validation.reason });
		}

		if (window.chosenResponse === null) {
			const recorded = await recordThumperEventWindowResponse(db, {
				thumperRunId: run.id,
				windowIndex,
				chosenResponse
			});
			if (!recorded) {
				return fail(400, { message: 'Could not record event window response' });
			}
		}

		const state = await loadOpenRunState(db, run);
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

		return {
			craftOutcome: {
				status: outcome.status,
				item: outcome.item,
				explanation: outcome.explanation
			},
			craftContext
		};
	}
};
