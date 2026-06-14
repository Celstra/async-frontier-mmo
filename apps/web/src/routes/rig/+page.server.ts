import {
	acknowledgeThumperRunResult,
	applyRepairKitToItemForPilot,
	countFieldRepairKitsForPilot,
	equipScannerItemForPilot,
	equipThumperPartForPilot,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	recordThumperEventWindowResponseForPilot
} from '@async-frontier-mmo/db';
import {
	THUMPER_PART_SLOTS,
	tutorialRunFromSeed,
	type ThumperComplicationId,
	type ThumperEventActionId,
	type ThumperPartSlot
} from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import {
	isRunEndedByRecall,
	loadOpenRunState,
	parseChosenResponse,
	parseWindowIndex,
	validateEventWindowRespondOrder,
	validateEventWindowResponse
} from '$lib/server/fieldRunState';
import { claimOpenRun } from '$lib/server/fieldWorkflow';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { trackFieldFirstClaim, trackItemEquipped, trackRigEventResponseSubmitted, trackSliceEventWindowResolved } from '$lib/server/playtestTelemetry';
import { loadRigScreen } from '$lib/server/rigLoad';
import { isRigEquipmentLocked, RIG_EQUIPMENT_LOCKED_MESSAGE } from '$lib/server/rigEquipmentLock';
import { resolveTargetDisplayName } from '$lib/server/targetResource';
import { advanceTutorialStepIf, readTutorialStep } from '$lib/server/tutorialOrchestration';
import type { Actions, PageServerLoad } from './$types';

async function rigData(db: ReturnType<typeof getGameDb>, pilotId: string) {
	return loadRigScreen(db, pilotId);
}

async function rejectEquipmentChangeIfLocked(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
) {
	if (!(await isRigEquipmentLocked(db, pilotId))) {
		return null;
	}

	return fail(400, {
		message: RIG_EQUIPMENT_LOCKED_MESSAGE,
		...(await rigData(db, pilotId))
	});
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
	respondEventWindow: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const run = await getOpenThumperRunForPilot(db, pilotId);
		if (!run) {
			return fail(400, { message: 'No open thumper run', ...(await rigData(db, pilotId)) });
		}

		const formData = await event.request.formData();
		const windowIndex = parseWindowIndex(formData.get('windowIndex'));
		const chosenResponse = parseChosenResponse(formData.get('chosenResponse'));
		if (windowIndex === null || chosenResponse === null) {
			return fail(400, { message: 'Invalid event window response', ...(await rigData(db, pilotId)) });
		}

		const windows = await getThumperEventWindowsForRun(db, run.id);
		const window = windows.find((row) => row.windowIndex === windowIndex);
		if (!window) {
			return fail(400, { message: 'Event window not found', ...(await rigData(db, pilotId)) });
		}

		if (isRunEndedByRecall(windows)) {
			return fail(400, { message: 'Run already ended by Recall Early', ...(await rigData(db, pilotId)) });
		}

		const orderValidation = validateEventWindowRespondOrder({
			windows,
			windowIndex,
			chosenResponse
		});
		if (!orderValidation.ok) {
			return fail(400, { message: orderValidation.reason, ...(await rigData(db, pilotId)) });
		}

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);
		const validation = validateEventWindowResponse({
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId,
			chosenResponse,
			fieldRepairKitCount
		});
		if (!validation.ok) {
			return fail(400, { message: validation.reason, ...(await rigData(db, pilotId)) });
		}

		if (window.chosenResponse === null) {
			const preRespondState = await loadOpenRunState(db, run, fieldRepairKitCount, {
				resolveDisplayName: resolveTargetDisplayName,
				includeRunMeters: true,
				isTutorialRun: tutorialRunFromSeed(run.runSeed) !== null
			});
			if (!preRespondState.runMeters) {
				return fail(500, { message: 'Run meters unavailable', ...(await rigData(db, pilotId)) });
			}

			const outcome = await recordThumperEventWindowResponseForPilot(db, {
				pilotId,
				thumperRunId: run.id,
				windowIndex,
				complication: window.complication,
				matchingAction: window.matchingAction,
				severity: window.severity ?? 'minor',
				chosenResponse,
				currentMeters: preRespondState.runMeters,
				totalWindowCount: windows.length,
				runHullCondition: run.runHullCondition,
				runHullIntegrity: run.runHullIntegrity,
				tutorialDeterministic: tutorialRunFromSeed(run.runSeed) !== null
			});
			if (outcome.status === 'no_repair_kit') {
				return fail(400, {
					message: 'Field Repair requires a crafted Field Repair Kit',
					...(await rigData(db, pilotId))
				});
			}
			if (outcome.status === 'not_recorded') {
				return fail(400, {
					message: 'Could not record event window response',
					...(await rigData(db, pilotId))
				});
			}

			await trackSliceEventWindowResolved(db, pilotId, {
				windowIndex,
				chosenResponse,
				complication: window.complication
			});
			await trackRigEventResponseSubmitted(db, pilotId, {
				windowIndex,
				chosenResponse,
				complication: window.complication,
				screen: 'rig'
			});
		}

		return rigData(db, pilotId);
	},
	claim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const now = new Date();
		const tutorialStepBeforeClaim = await readTutorialStep(db, pilotId);
		let outcome;
		try {
			outcome = await claimOpenRun(db, pilotId, now);
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Claim failed unexpectedly',
				...(await rigData(db, pilotId))
			});
		}

		if (outcome.status === 'claimed' || outcome.status === 'already_claimed') {
			if (outcome.status === 'claimed' && outcome.claimResult) {
				if (tutorialStepBeforeClaim === 'first_deploy') {
					await trackFieldFirstClaim(db, pilotId, {
						recoveredQuantity: outcome.claimResult.recoveredQuantity
					});
					await advanceTutorialStepIf(db, pilotId, 'first_deploy', 'recall_lesson');
				} else if (tutorialStepBeforeClaim === 'second_deploy') {
					await advanceTutorialStepIf(db, pilotId, 'second_deploy', 'full_claim');
				}
			}
			return rigData(db, pilotId);
		}

		if (outcome.status === 'not_claimable') {
			return fail(400, { message: 'Thumper is not claimable yet', ...(await rigData(db, pilotId)) });
		}

		return fail(400, {
			message: outcome.status === 'not_resolvable' ? outcome.message : 'No thumper to claim',
			...(await rigData(db, pilotId))
		});
	},
	acknowledgeClaim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const thumperRunId = formData.get('thumperRunId');
		if (typeof thumperRunId !== 'string') {
			return fail(400, { message: 'Missing thumper run', ...(await rigData(db, pilotId)) });
		}

		const outcome = await acknowledgeThumperRunResult(db, {
			pilotId,
			thumperRunId
		});

		if (outcome.status === 'not_found') {
			return fail(400, { message: 'Claim result not found', ...(await rigData(db, pilotId)) });
		}

		return rigData(db, pilotId);
	},
	equipScanner: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);
		const locked = await rejectEquipmentChangeIfLocked(db, pilotId);
		if (locked) return locked;

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
		const locked = await rejectEquipmentChangeIfLocked(db, pilotId);
		if (locked) return locked;

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
		const locked = await rejectEquipmentChangeIfLocked(db, pilotId);
		if (locked) return locked;

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

		if (outcome.status === 'invalid_target' || outcome.status === 'nothing_to_repair') {
			return fail(400, {
				message: outcome.reason,
				...(await rigData(db, pilotId))
			});
		}

		return rigData(db, pilotId);
	}
};
