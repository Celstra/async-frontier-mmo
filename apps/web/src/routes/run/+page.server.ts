import {
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	recordThumperEventWindowResponseForPilot,
	countFieldRepairKitsForPilot
} from '@async-frontier-mmo/db';
import {
	FIELD_REPAIR_REQUIRES_KIT_REASON,
	TUTORIAL_RUN_SEED,
	type ThumperComplicationId,
	type ThumperEventActionId
} from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';
import { frameChoiceLabel, frameChoiceVerb } from '$lib/pilotHome';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	isRunEndedByRecall,
	loadOpenRunState,
	loadThumperRunScreen,
	parseChosenResponse,
	parseWindowIndex,
	validateEventWindowRespondOrder,
	validateEventWindowResponse
} from '$lib/server/runLoad';
import { resolveTargetDisplayName } from '$lib/server/targetResource';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const gate = await requireFrameChosenPilot(db, pilotId);
	if (gate) {
		redirect(303, '/');
	}

	const state = await loadThumperRunScreen(db, pilotId, resolveTargetDisplayName);
	if (!state) {
		redirect(303, '/');
	}

	return {
		...state,
		frameLabel: frameChoiceLabel(state.openRun.pilotFrameId),
		frameVerb: frameChoiceVerb(state.openRun.pilotFrameId),
		fieldRepairRequiresKitReason: FIELD_REPAIR_REQUIRES_KIT_REASON
	};
};

export const actions: Actions = {
	respond: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const gate = await requireFrameChosenPilot(db, pilotId);
		if (gate) return gate;

		const run = await getOpenThumperRunForPilot(db, pilotId);
		if (!run) {
			return fail(400, { message: 'No open thumper run' });
		}

		const formData = await event.request.formData();
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

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);
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
				pilotId,
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

		const refreshedRun = (await getOpenThumperRunForPilot(db, pilotId))!;
		const refreshedKitCount = await countFieldRepairKitsForPilot(db, pilotId);
		const state = await loadOpenRunState(db, refreshedRun, refreshedKitCount, {
			resolveDisplayName: resolveTargetDisplayName,
			includeRunMeters: true,
			isTutorialRun: refreshedRun.runSeed === TUTORIAL_RUN_SEED
		});

		return {
			...state,
			frameLabel: frameChoiceLabel(state.openRun.pilotFrameId),
			frameVerb: frameChoiceVerb(state.openRun.pilotFrameId),
			fieldRepairRequiresKitReason: FIELD_REPAIR_REQUIRES_KIT_REASON
		};
	}
};
