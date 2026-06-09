import {
	claimThumperRun,
	createDb,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getThumperRunResultForRun,
	insertThumperEventWindows,
	insertThumperRun,
	insertThumperRunResult,
	recordThumperEventWindowResponse
} from '@async-frontier-mmo/db';
import {
	generateFirstSessionEventWindows,
	getRedMesaResource,
	RED_MESA_BLOOM_RESOURCES,
	resolveFirstSessionThumperRunResult,
	surveyRedMesaFirstSession,
	THUMPER_EVENT_ACTIONS,
	type NamedResourceId,
	type ThumperEventActionId,
	type ThumperWindowChosenResponse,
	resolveThumperState
} from '@async-frontier-mmo/domain';
import { DEMO_PILOT_ID } from 'shared';
import { error, fail } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
import type { Actions, PageServerLoad } from './$types';

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
	if (value === 'hold') {
		return 'hold';
	}
	if (typeof value === 'string' && THUMPER_EVENT_ACTIONS.includes(value as ThumperEventActionId)) {
		return value as ThumperEventActionId;
	}
	return null;
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

	return {
		thumperDemo,
		loadedAt: now.toISOString(),
		openRun: {
			id: run.id,
			targetResourceId: run.targetResourceId,
			targetDisplayName: target.displayName
		},
		eventWindows: eventWindows.map((window) => ({
			windowIndex: window.windowIndex,
			complication: window.complication,
			matchingAction: window.matchingAction,
			chosenResponse: window.chosenResponse,
			responded: window.chosenResponse !== null
		}))
	};
}

export const load: PageServerLoad = async () => {
	const survey = surveyRedMesaFirstSession();
	const db = getDb();
	const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

	if (!run) {
		return { thumperDemo: null, loadedAt: null, survey, openRun: null, eventWindows: [] };
	}

	const state = await loadOpenRunState(db, run);
	return { survey, ...state };
};

export const actions: Actions = {
	deploy: async ({ request }) => {
		const db = getDb();
		const open = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

		if (open) {
			return fail(400, { message: 'Demo pilot already has an open thumper' });
		}

		const formData = await request.formData();
		const targetResourceId = parseTargetResourceId(formData.get('targetResourceId'));
		if (!targetResourceId) {
			return fail(400, { message: 'Invalid or missing target resource' });
		}

		const deployedAt = new Date();
		const durationSeconds = 60;

		const run = await insertThumperRun(db, {
			pilotId: DEMO_PILOT_ID,
			targetResourceId,
			deployedAt,
			durationSeconds
		});

		if (targetResourceId === 'veyrith_copper') {
			const plan = generateFirstSessionEventWindows({ targetResourceId });
			await insertThumperEventWindows(db, {
				thumperRunId: run.id,
				windows: plan.windows.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication,
					matchingAction: window.matchingAction
				}))
			});
		}

		const state = await loadOpenRunState(db, run);
		return state;
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
		const run = await getOpenThumperRunForPilot(db, DEMO_PILOT_ID);

		if (!run) {
			const latest = await getLatestThumperRunForPilot(db, DEMO_PILOT_ID);
			if (latest?.claimedAt) {
				const existingResult = await getThumperRunResultForRun(db, latest.id);
				return { thumperDemo: null, claimed: true, claimResult: existingResult };
			}
			return fail(400, { message: 'No thumper to claim' });
		}

		const thumperDemo = resolveThumperState({
			deployedAt: run.deployedAt,
			durationSeconds: run.durationSeconds,
			now: new Date()
		});

		if (thumperDemo.status !== 'claimable') {
			return fail(400, { message: 'Thumper is not claimable yet', thumperDemo });
		}

		const windows = await getThumperEventWindowsForRun(db, run.id);
		if (windows.length > 0) {
			const unresolved = windows.filter((window) => window.chosenResponse === null);
			if (unresolved.length > 0) {
				return fail(400, {
					message: 'Resolve all event windows before claiming',
					eventWindows: windows
				});
			}

			const result = resolveFirstSessionThumperRunResult({
				targetResourceId: run.targetResourceId as NamedResourceId,
				responses: windows.map((window) => ({
					windowIndex: window.windowIndex,
					complication: window.complication as 'signal_drift' | 'pump_strain',
					chosenResponse: window.chosenResponse as ThumperWindowChosenResponse
				}))
			});

			const resolvedAt = new Date();
			await insertThumperRunResult(db, {
				thumperRunId: run.id,
				targetResourceId: result.targetResourceId,
				projectedRecovery: result.projectedRecovery,
				recoveredQuantity: result.recoveredQuantity,
				wasteQuantity: result.wasteQuantity,
				explanation: result.explanation,
				resolvedAt
			});
		}

		await claimThumperRun(db, run.id);
		const claimResult = await getThumperRunResultForRun(db, run.id);

		return { thumperDemo: null, claimed: true, claimResult };
	}
};
