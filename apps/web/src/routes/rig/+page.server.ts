import {
	applyRepairKitToItemForPilot,
	equipScannerItemForPilot,
	equipThumperPartForPilot
} from '@async-frontier-mmo/db';
import { THUMPER_PART_SLOTS, type ThumperPartSlot } from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { trackItemEquipped } from '$lib/server/playtestTelemetry';
import { loadRigScreen } from '$lib/server/rigLoad';
import type { Actions, PageServerLoad } from './$types';

async function rigData(db: ReturnType<typeof getGameDb>, pilotId: string) {
	return loadRigScreen(db, pilotId);
}

function parseThumperSlot(value: FormDataEntryValue | null): ThumperPartSlot | null {
	if (typeof value !== 'string') return null;
	return THUMPER_PART_SLOTS.includes(value as ThumperPartSlot) ? (value as ThumperPartSlot) : null;
}

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);
	return rigData(db, pilotId);
};

export const actions: Actions = {
	equipScanner: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const itemId = (await event.request.formData()).get('itemId');
		if (typeof itemId !== 'string') {
			return fail(400, {
				message: 'Pick a scanner to equip',
				...(await rigData(db, pilotId))
			});
		}

		const outcome = await equipScannerItemForPilot(db, { pilotId, itemId });
		if (outcome.status === 'invalid') {
			return fail(400, {
				message: outcome.reason,
				...(await rigData(db, pilotId))
			});
		}

		await trackItemEquipped(db, pilotId, {
			itemKind: 'scanner',
			displayName: outcome.item.displayName
		});

		return rigData(db, pilotId);
	},

	equipThumperPart: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const slot = parseThumperSlot(formData.get('slot'));
		const itemId = formData.get('itemId');

		if (!slot || typeof itemId !== 'string') {
			return fail(400, {
				message: 'Pick a part and slot to equip',
				...(await rigData(db, pilotId))
			});
		}

		const outcome = await equipThumperPartForPilot(db, { pilotId, slot, itemId });
		if (outcome.status === 'invalid') {
			return fail(400, {
				message: outcome.reason,
				...(await rigData(db, pilotId))
			});
		}

		if (outcome.status === 'equipped') {
			await trackItemEquipped(db, pilotId, {
				itemKind: 'thumper_part',
				displayName: outcome.item.displayName,
				slot
			});
		}

		return rigData(db, pilotId);
	},

	repairItem: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const itemId = (await event.request.formData()).get('itemId');
		if (typeof itemId !== 'string') {
			return fail(400, {
				message: 'Pick an item to repair',
				...(await rigData(db, pilotId))
			});
		}

		const outcome = await applyRepairKitToItemForPilot(db, { pilotId, targetItemId: itemId });

		if (outcome.status === 'no_repair_kit') {
			return fail(400, {
				message: 'No Field Repair kits — craft one in WORKSHOP',
				...(await rigData(db, pilotId))
			});
		}

		if (outcome.status === 'invalid_target') {
			return fail(400, {
				message: outcome.reason,
				...(await rigData(db, pilotId))
			});
		}

		return rigData(db, pilotId);
	}
};
