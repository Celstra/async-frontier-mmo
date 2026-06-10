import {
	claimOpenThumperRunForPilot,
	createDb,
	deployThumperRunWithEventWindows,
	ensureDemoPilot,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getPilotFrame,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	hasPilotCompletedTutorialThumper,
	recordThumperEventWindowResponse
} from '@async-frontier-mmo/db';
import {
	assertVeyrithTutorialWindowsReady,
	generateThumperEventWindows,
	getEventWindowResponseOptions,
	getRedMesaResource,
	isTutorialThumperDeploy,
	TUTORIAL_RUN_SEED,
	RED_MESA_BLOOM_RESOURCES,
	resolveFirstSessionThumperRunResult,
	surveyRedMesaFirstSession,
	THUMPER_EVENT_ACTIONS,
	validateEventWindowRespondOrder,
	validateEventWindowResponse,
	type NamedResourceId,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse,
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

function isRunReadyToResolve(
	windows: ReadonlyArray<{ chosenResponse: string | null }>
): boolean {
	if (windows.length === 0) {
		return true;
	}
	if (isRunEndedByRecall(windows)) {
		return true;
	}
	return windows.every((window) => window.chosenResponse !== null);
}

function isRunClaimableByTimer(
	run: { deployedAt: Date; durationSeconds: number },
	now: Date
): boolean {
	return (
		resolveThumperState({
			deployedAt: run.deployedAt,
			durationSeconds: run.durationSeconds,
			now
		}).status === 'claimable'
	);
}

function isRunClaimableForPilot(
	run: { deployedAt: Date; durationSeconds: number },
	windows: Awaited<ReturnType<typeof getThumperEventWindowsForRun>>,
	now: Date
): boolean {
	if (isRunEndedByRecall(windows)) {
		return isRunReadyToResolve(windows);
	}
	return isRunClaimableByTimer(run, now);
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
		runReadyToResolve: isRunReadyToResolve(eventWindows)
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

async function claimTutorialRun(db: ReturnType<typeof getDb>, now: Date) {
	return claimOpenThumperRunForPilot(db, {
		pilotId: DEMO_PILOT_ID,
		now,
		isClaimable: (run, windows) => isRunClaimableForPilot(run, windows, now),
		isResolvableRun: (run) => run.runSeed === TUTORIAL_RUN_SEED,
		notResolvableMessage: SEEDED_RUN_NOT_RESOLVABLE_MESSAGE,
		validateWindows: (run, windows) => {
			if (run.runSeed === TUTORIAL_RUN_SEED) {
				assertVeyrithTutorialWindowsReady(windows);
			}
		},
		buildResult: (run, windows) => buildTutorialClaimResult(run, windows)
	});
}

export const load: PageServerLoad = async () => {
	const survey = surveyRedMesaFirstSession();
	const db = getDb();
	await ensureDemoPilot(db);
	const pilotFrame = await getPilotFrame(db, DEMO_PILOT_ID);
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
			hasCompletedTutorial
		};
	}

	const state = await loadOpenRunState(db, run);
	return { survey, pilotFrame, hasCompletedTutorial, ...state };
};

export const actions: Actions = {
	deploy: async ({ request }) => {
		const db = getDb();
		await ensureDemoPilot(db);
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
			return { thumperDemo: null, claimed: true, claimResult: outcome.claimResult };
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
	}
};
