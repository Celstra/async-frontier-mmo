import { deliverResourceStackToSettlementOrder } from '@async-frontier-mmo/db';
import { fail } from '@sveltejs/kit';
import { loadSettlementScreen } from '$lib/server/settlementLoad';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackFabricatorOnlineSeen,
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
	return settlementData(db, pilotId);
};

export const actions: Actions = {
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
	}
};
