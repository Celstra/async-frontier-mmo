import {
	deliverResourceStackToSettlementOrder,
	ensureNextNeedOrdersPostedForPilot,
	getEquippedThumperPartsForPilot,
	getPilotTutorialStep,
	patchEquippedHullForTutorial
} from '@async-frontier-mmo/db';
import { fail } from '@sveltejs/kit';
import { allowedExtractionTailsForEquippedHull } from '$lib/server/fieldDeployLoad';
import { loadFirstAsyncTailState } from '$lib/server/firstAsyncTailState';
import { loadSettlementScreen } from '$lib/server/settlementLoad';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackAsyncDurationChosen,
	trackFabricatorOnlineSeen,
	trackPrologueDone,
	trackSettlementTurnIn
} from '$lib/server/playtestTelemetry';
import { advanceTutorialStepIf } from '$lib/server/tutorialOrchestration';
import type { Actions, PageServerLoad } from './$types';

async function settlementData(db: ReturnType<typeof getGameDb>, pilotId: string) {
	return loadSettlementScreen(db, pilotId);
}

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);
	if (await advanceTutorialStepIf(db, pilotId, 'full_claim', 'async_reveal')) {
		await ensureNextNeedOrdersPostedForPilot(db, pilotId);
	}
	return settlementData(db, pilotId);
};

export const actions: Actions = {
	dismissPrologue: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		await trackPrologueDone(db, pilotId);
		await advanceTutorialStepIf(db, pilotId, 'prologue', 'first_orders');

		return settlementData(db, pilotId);
	},

	turnIn: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const orderId = formData.get('orderId');
		const resourceInstanceId = formData.get('resourceInstanceId');

		if (typeof orderId !== 'string' || typeof resourceInstanceId !== 'string') {
			return fail(400, {
				message: 'Pick a stack to turn in',
				...(await settlementData(db, pilotId))
			});
		}

		const outcome = await deliverResourceStackToSettlementOrder(db, {
			pilotId,
			orderId,
			resourceInstanceId
		});

		if (outcome.status === 'delivered') {
			await trackSettlementTurnIn(db, pilotId, {
				orderId,
				resourceInstanceId,
				deliveredUnits: outcome.deliveredUnits,
				orderFilled: outcome.orderFilled
			});

			if (outcome.fabricatorMilestoneCompleted) {
				await advanceTutorialStepIf(db, pilotId, 'turn_in', 'fabricator_online');
			}

			return settlementData(db, pilotId);
		}

		const message =
			outcome.status === 'wrong_family'
				? 'That stack is the wrong family for this order'
				: outcome.status === 'wrong_instance'
					? 'This order is bound to a different resource — only one stack counts'
					: outcome.status === 'stack_empty'
						? 'That stack is empty'
						: outcome.status === 'order_not_open'
							? 'This order is already filled'
							: 'Could not turn in that stack';

		return fail(400, {
			message,
			...(await settlementData(db, pilotId))
		});
	},

	dismissFabricator: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);
		await trackFabricatorOnlineSeen(db, pilotId);
		await advanceTutorialStepIf(db, pilotId, 'fabricator_online', 'assemble_rig');
		return settlementData(db, pilotId);
	},

	dismissRecallLesson: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const step = await getPilotTutorialStep(db, pilotId);
		if (step !== 'recall_lesson') {
			return fail(400, {
				message: 'No recall briefing to acknowledge right now',
				...(await settlementData(db, pilotId))
			});
		}

		await advanceTutorialStepIf(db, pilotId, 'recall_lesson', 'hull_patch');
		return settlementData(db, pilotId);
	},

	applyHullPatch: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const step = await getPilotTutorialStep(db, pilotId);
		if (step !== 'hull_patch') {
			return fail(400, {
				message: 'Hull patch is not available at this step',
				...(await settlementData(db, pilotId))
			});
		}

		const outcome = await patchEquippedHullForTutorial(db, pilotId);
		if (outcome.status === 'no_hull') {
			return fail(400, {
				message: 'Equip a hull in RIG before the foreman can patch it',
				...(await settlementData(db, pilotId))
			});
		}

		await advanceTutorialStepIf(db, pilotId, 'hull_patch', 'second_deploy');
		return settlementData(db, pilotId);
	},

	chooseAsyncDuration: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const step = await getPilotTutorialStep(db, pilotId);
		if (step !== 'async_reveal') {
			return fail(400, {
				message: 'Pick a run duration when the foreman unlocks async deployments',
				...(await settlementData(db, pilotId))
			});
		}

		const formData = await event.request.formData();
		const tailMinutesRaw = formData.get('tailMinutes');
		const tailMinutes = Number.parseInt(String(tailMinutesRaw ?? ''), 10);
		const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
		const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep: step });
		const allowedTails = allowedExtractionTailsForEquippedHull(equipped, firstAsync);

		if (!Number.isFinite(tailMinutes) || !allowedTails.includes(tailMinutes)) {
			return fail(400, {
				message: allowedTails.length
					? 'That run duration exceeds your hull ceiling — pick a shorter tail or craft a better hull'
					: 'Equip a hull before choosing a run duration',
				...(await settlementData(db, pilotId))
			});
		}

		await ensureNextNeedOrdersPostedForPilot(db, pilotId);
		await trackAsyncDurationChosen(db, pilotId, { extractionTailMinutes: tailMinutes });
		await advanceTutorialStepIf(db, pilotId, 'async_reveal', 'done');
		return settlementData(db, pilotId);
	}
};
