import { THUMPER_COMMANDS } from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import {
	advanceFieldCommandQueueBeat,
	claimFieldCommandQueueRun,
	parseCommandQueueActionForm,
	recallFieldCommandQueueRun,
	submitFieldCommandQueueSlot
} from '$lib/server/fieldActions.js';
import { loadFieldCommandQueueView } from '$lib/server/fieldCommandQueueLoad.js';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	const commandQueue = await loadFieldCommandQueueView(db, pilotId);

	return {
		screenId: 'field' as const,
		commandQueue,
		commands: THUMPER_COMMANDS
	};
};

export const actions: Actions = {
	queueCommand: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const command = parseCommandQueueActionForm(await event.request.formData());
		if (!command) {
			return fail(400, { message: 'Missing or invalid command' });
		}

		return submitFieldCommandQueueSlot(db, { pilotId, command });
	},
	advanceBeat: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		return advanceFieldCommandQueueBeat(db, { pilotId });
	},
	recallRun: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		return recallFieldCommandQueueRun(db, { pilotId });
	},
	claimRun: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		return claimFieldCommandQueueRun(db, { pilotId });
	}
};
