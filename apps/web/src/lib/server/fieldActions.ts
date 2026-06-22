import {
	advanceCommandQueueBeatForPilot,
	recallCommandQueueRunForPilot,
	submitCommandQueueSlotForPilot
} from '@async-frontier-mmo/db';
import { THUMPER_COMMANDS, type ThumperCommand } from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import type { getGameDb } from './gameDb.js';
import { claimOpenRun } from './fieldWorkflow.js';
import { loadFieldCommandQueueView } from './fieldCommandQueueLoad.js';

function parseThumperCommand(value: FormDataEntryValue | null): ThumperCommand | null {
	if (typeof value !== 'string') {
		return null;
	}
	return THUMPER_COMMANDS.includes(value as ThumperCommand)
		? (value as ThumperCommand)
		: null;
}

function serializeView(view: Awaited<ReturnType<typeof loadFieldCommandQueueView>>) {
	return view;
}

export async function submitFieldCommandQueueSlot(
	db: ReturnType<typeof getGameDb>,
	input: {
		pilotId: string;
		command: ThumperCommand;
		now?: Date;
	}
) {
	const outcome = await submitCommandQueueSlotForPilot(db, {
		pilotId: input.pilotId,
		command: input.command,
		now: input.now ?? new Date()
	});

	switch (outcome.status) {
		case 'recorded':
		case 'updated':
			return {
				ok: true as const,
				beatIndex: outcome.beatIndex,
				commandQueue: serializeView(await loadFieldCommandQueueView(db, input.pilotId))
			};
		case 'no_open_run':
			return fail(404, { message: 'No open command-queue thumper run' });
		case 'run_ended':
			return fail(409, { message: 'Thumper run has already ended' });
		case 'invalid_command':
			return fail(400, { message: 'Invalid thumper command' });
		case 'already_resolved':
			return fail(409, { message: 'Resolved beats cannot be changed' });
		case 'invalid_slot':
			return fail(400, { message: outcome.reason });
	}
}

export async function advanceFieldCommandQueueBeat(
	db: ReturnType<typeof getGameDb>,
	input: {
		pilotId: string;
		now?: Date;
	}
) {
	const outcome = await advanceCommandQueueBeatForPilot(db, {
		pilotId: input.pilotId,
		now: input.now ?? new Date()
	});

	switch (outcome.status) {
		case 'advanced':
			return {
				ok: true as const,
				beatIndex: outcome.beatIndex,
				command: outcome.command,
				commandQueue: serializeView(await loadFieldCommandQueueView(db, input.pilotId))
			};
		case 'no_open_run':
			return fail(404, { message: 'No open command-queue thumper run' });
		case 'run_ended':
			return fail(409, { message: 'Thumper run has already ended' });
		case 'not_ready':
			return fail(400, { message: outcome.reason });
	}
}

export async function recallFieldCommandQueueRun(
	db: ReturnType<typeof getGameDb>,
	input: {
		pilotId: string;
		now?: Date;
	}
) {
	const outcome = await recallCommandQueueRunForPilot(db, {
		pilotId: input.pilotId,
		now: input.now ?? new Date()
	});

	switch (outcome.status) {
		case 'recalled':
			return {
				ok: true as const,
				commandQueue: serializeView(await loadFieldCommandQueueView(db, input.pilotId))
			};
		case 'no_open_run':
			return fail(404, { message: 'No open command-queue thumper run' });
		case 'run_ended':
			return fail(409, { message: outcome.reason });
	}
}

export function parseCommandQueueActionForm(formData: FormData) {
	return parseThumperCommand(formData.get('command'));
}

export async function claimFieldCommandQueueRun(
	db: ReturnType<typeof getGameDb>,
	input: {
		pilotId: string;
		now?: Date;
	}
) {
	const outcome = await claimOpenRun(db, input.pilotId, input.now ?? new Date());

	switch (outcome.status) {
		case 'claimed':
			return {
				ok: true as const,
				claimed: true as const,
				recoveredQuantity: outcome.claimResult?.recoveredQuantity ?? 0,
				commandQueue: null
			};
		case 'already_claimed':
			return fail(409, { message: 'Run already claimed' });
		case 'no_open_run':
			return fail(404, { message: 'No open run to claim' });
		case 'not_claimable':
			return fail(400, { message: 'Run is not ready to claim yet' });
		case 'not_resolvable':
		case 'invalid_windows':
			return fail(400, { message: outcome.message });
	}
}
