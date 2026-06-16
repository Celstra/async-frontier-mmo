import {
	assertWorkshopBenchCraftInputs,
	craftSchematicForPilot,
	ensureWorkshopStarterGrantForPilot,
	openWorkshopCrateForPilot,
	reclaimWorkshopItemForPilot,
	setItemFavoriteForPilot,
	syncWorkshopSupplyCratesForPilot,
	WorkshopBenchResourceValidationError,
	WorkshopCrateNotFoundError,
	WorkshopCrateUnavailableError,
	WorkshopItemNotFoundError,
	WorkshopReclaimValidationError,
	WorkshopSliceItemValidationError
} from '@async-frontier-mmo/db';
import { isWorkshopActiveSchematic } from '@async-frontier-mmo/domain';
import { fail } from '@sveltejs/kit';
import { buildWorkshopCraftOutcome } from '$lib/server/craftOutcome';
import { WORKSHOP_SLICE_PLAYTEST } from '$lib/decision024';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackCraftResultAbandoned,
	trackCraftResultCraftAnotherClicked,
	trackCraftResultPulseViewed,
	trackCraftResultRevealSeen,
	trackCraftStarted,
	trackCraftCompleted,
	trackExperimentPulseConfigured,
	trackItemFavorited,
	trackItemReclaimPreviewed,
	trackItemReclaimed,
	trackItemUnfavorited,
	trackNoCraftableResourcesState,
	trackOverdriveCritScrapSeen,
	trackResourceSlotFilled,
	trackResourceSlotReplaced,
	trackResultCompared,
	trackSchematicSelected,
	trackStarterResourcesViewed,
	trackSupplyCrateAvailable,
	trackSupplyCrateOpened,
	trackTuningChanged,
	trackWorkshopSliceSessionStarted,
	trackWorkshopStationViewed,
	trackWorkshopViewed
} from '$lib/server/workshopTelemetry';
import {
	loadWorkshopScreen,
	parseCraftMode,
	parseExperimentPulses,
	parseSlotInstanceId,
	parseTuningFromForm,
	schematicByIdFromActiveSlice
} from '$lib/server/workshopLoad';
import type { Actions, PageServerLoad } from './$types';

async function refreshWorkshopScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	url: URL
) {
	await syncWorkshopSupplyCratesForPilot(db, pilotId);
	return loadWorkshopScreen(db, pilotId, url);
}

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	await requirePlayablePilot(db, pilotId);

	event.depends('workshop:supply');

	await ensureWorkshopStarterGrantForPilot(db, pilotId);

	const screen = await refreshWorkshopScreen(db, pilotId, event.url);

	for (const crate of screen.supply.availableCrates) {
		await trackSupplyCrateAvailable(db, pilotId, {
			crateId: crate.id,
			reason: crate.reason,
			sequence: crate.sequence
		});
	}

	await trackWorkshopSliceSessionStarted(db, pilotId);
	await trackStarterResourcesViewed(db, pilotId, {
		stackCount: screen.inventory.length,
		totalUnits: screen.inventory.reduce((sum, stack) => sum + stack.quantity, 0),
		stacks: screen.inventory.map((stack) => ({
			resourceInstanceId: stack.resourceInstanceId,
			resourceSlug: stack.resourceSlug,
			family: stack.family,
			quantity: stack.quantity,
			stats: stack.stats
		}))
	});
	if (screen.selectedSchematicId) {
		await trackSchematicSelected(db, pilotId, { schematicId: screen.selectedSchematicId });
	}
	if (!screen.supply.canCraftAnyThumperPart) {
		await trackNoCraftableResourcesState(db, pilotId);
	}

	await trackWorkshopViewed(db, pilotId, {
		selectedSchematicId: screen.selectedSchematicId ?? 'none'
	});
	await trackWorkshopStationViewed(db, pilotId, {
		station: screen.workshopStation,
		selectedSchematicId: screen.selectedSchematicId ?? 'none'
	});

	return screen;
};

export const actions: Actions = {
	craft: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const schematicId = formData.get('schematicId');
		const idempotencyKey = formData.get('idempotencyKey');
		const craftMode = parseCraftMode(formData.get('craftMode'));

		if (typeof schematicId !== 'string' || !isWorkshopActiveSchematic(schematicId)) {
			return fail(400, { message: 'Invalid schematic' });
		}

		const schematic = schematicByIdFromActiveSlice(schematicId);
		if (!schematic) {
			return fail(400, { message: 'Invalid schematic' });
		}

		const tuning = parseTuningFromForm(schematic, formData);

		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing craft idempotency key' });
		}
		if (!craftMode) {
			return fail(400, { message: 'Invalid craft mode' });
		}
		if (!tuning) {
			return fail(400, { message: 'Allocate exactly 3 tuning points' });
		}

		const slotInputs = schematic.slots.map((slot) => {
			const resourceInstanceId = parseSlotInstanceId(formData, slot.id);
			if (!resourceInstanceId) {
				return null;
			}
			return { slotId: slot.id, resourceInstanceId };
		});

		if (slotInputs.some((slot) => slot === null)) {
			return fail(400, { message: 'Every schematic slot must be filled' });
		}

		try {
			await assertWorkshopBenchCraftInputs(
				db,
				slotInputs.map((slot) => slot!.resourceInstanceId)
			);
		} catch (error) {
			if (error instanceof WorkshopBenchResourceValidationError) {
				return fail(400, {
					message: 'Workshop crafting requires bench stock resources',
					...(await refreshWorkshopScreen(db, pilotId, event.url))
				});
			}
			throw error;
		}

		const experimentPulses =
			craftMode === 'careful_experiment'
				? parseExperimentPulses(schematic, formData)
				: undefined;
		if (craftMode === 'careful_experiment' && experimentPulses === null) {
			return fail(400, {
				message: 'Choose a property line and push size for both experiment pulses'
			});
		}

		await trackCraftStarted(db, pilotId, {
			schematicId: schematic.id,
			craftMode,
			idempotencyKey
		});

		const outcome = await craftSchematicForPilot(db, {
			pilotId,
			idempotencyKey,
			schematic,
			slotInputs: slotInputs as Array<{ slotId: string; resourceInstanceId: string }>,
			tuning,
			craftMode,
			experimentSeed: idempotencyKey,
			...(experimentPulses ? { experimentPulses } : {})
		});

		if (outcome.status === 'invalid_craft') {
			return fail(400, {
				message: outcome.reason,
				...(await refreshWorkshopScreen(db, pilotId, event.url))
			});
		}

		const craftOutcome = await buildWorkshopCraftOutcome(db, pilotId, {
			schematic,
			status: outcome.status,
			item: outcome.item,
			explanation: outcome.explanation
		});

		if (outcome.status !== 'already_crafted') {
			await trackCraftCompleted(db, pilotId, {
				schematicId: schematic.id,
				craftMode,
				item: outcome.item,
				explanation: outcome.explanation
			});
			await trackCraftResultRevealSeen(db, pilotId, {
				schematicId: schematic.id,
				itemId: outcome.item.id,
				craftMode
			});

			if ((craftOutcome.explanation.experimentScrapUnits ?? 0) > 0) {
				await trackOverdriveCritScrapSeen(db, pilotId, {
					schematicId: schematic.id,
					itemId: outcome.item.id,
					scrapUnits: craftOutcome.explanation.experimentScrapUnits
				});
			}
		}

		return {
			craftOutcome,
			...(await refreshWorkshopScreen(db, pilotId, event.url))
		};
	},

	craftRevealTelemetry: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const telemetryEvent = formData.get('telemetryEvent');
		const itemId = formData.get('itemId');
		const schematicId = formData.get('schematicId');

		const payload = {
			...(typeof itemId === 'string' ? { itemId } : {}),
			...(typeof schematicId === 'string' ? { schematicId } : {})
		};

		if (telemetryEvent === 'craft_result_compare_clicked') {
			await trackResultCompared(db, pilotId, payload);
		} else if (telemetryEvent === 'craft_result_craft_another_clicked') {
			await trackCraftResultCraftAnotherClicked(db, pilotId, payload);
		} else if (telemetryEvent === 'craft_result_pulse_viewed') {
			await trackCraftResultPulseViewed(db, pilotId, payload);
		} else if (telemetryEvent === 'craft_result_abandoned') {
			await trackCraftResultAbandoned(db, pilotId, payload);
		}

		return { ok: true };
	},

	benchTelemetry: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const telemetryEvent = formData.get('telemetryEvent');
		const schematicId = formData.get('schematicId');
		const payloadRaw = formData.get('payload');

		if (typeof schematicId !== 'string' || typeof payloadRaw !== 'string') {
			return fail(400, { message: 'Invalid bench telemetry' });
		}

		let payload: Record<string, unknown>;
		try {
			payload = JSON.parse(payloadRaw) as Record<string, unknown>;
		} catch {
			return fail(400, { message: 'Invalid bench telemetry payload' });
		}

		if (telemetryEvent === 'resource_slot_filled') {
			const slotId = payload.slotId;
			const resourceInstanceId = payload.resourceInstanceId;
			const resourceSlug = payload.resourceSlug;
			const stats = payload.stats;
			if (
				typeof slotId !== 'string' ||
				typeof resourceInstanceId !== 'string' ||
				typeof resourceSlug !== 'string' ||
				typeof stats !== 'object' ||
				stats === null
			) {
				return fail(400, { message: 'Invalid slot fill telemetry' });
			}
			await trackResourceSlotFilled(db, pilotId, {
				schematicId,
				slotId,
				resourceInstanceId,
				resourceSlug,
				stats: stats as Record<string, number>
			});
		} else if (telemetryEvent === 'resource_slot_replaced') {
			const slotId = payload.slotId;
			const fromResourceInstanceId = payload.fromResourceInstanceId;
			const toResourceInstanceId = payload.toResourceInstanceId;
			const toResourceSlug = payload.toResourceSlug;
			const stats = payload.stats;
			if (
				typeof slotId !== 'string' ||
				typeof fromResourceInstanceId !== 'string' ||
				typeof toResourceInstanceId !== 'string' ||
				typeof toResourceSlug !== 'string' ||
				typeof stats !== 'object' ||
				stats === null
			) {
				return fail(400, { message: 'Invalid slot replace telemetry' });
			}
			await trackResourceSlotReplaced(db, pilotId, {
				schematicId,
				slotId,
				fromResourceInstanceId,
				toResourceInstanceId,
				toResourceSlug,
				stats: stats as Record<string, number>
			});
		} else if (telemetryEvent === 'tuning_changed') {
			const allocation = payload.allocation;
			if (typeof allocation !== 'object' || allocation === null) {
				return fail(400, { message: 'Invalid tuning telemetry' });
			}
			await trackTuningChanged(db, pilotId, {
				schematicId,
				allocation: allocation as Record<string, number>
			});
		} else if (telemetryEvent === 'experiment_pulse_configured') {
			const pulseIndex = payload.pulseIndex;
			const propertyId = payload.propertyId;
			const push = payload.push;
			if (
				typeof pulseIndex !== 'number' ||
				typeof propertyId !== 'string' ||
				typeof push !== 'string'
			) {
				return fail(400, { message: 'Invalid pulse telemetry' });
			}
			await trackExperimentPulseConfigured(db, pilotId, {
				schematicId,
				pulseIndex,
				propertyId,
				push
			});
		} else {
			return fail(400, { message: 'Unknown bench telemetry event' });
		}

		return { ok: true };
	},

	installCraftedItem: async (event) => {
		if (WORKSHOP_SLICE_PLAYTEST) {
			return fail(403, { message: 'Equipment install is not in this playtest yet.' });
		}

		return fail(404, { message: 'Unavailable' });
	},

	assembleRig: async (event) => {
		if (WORKSHOP_SLICE_PLAYTEST) {
			return fail(403, { message: 'Chassis assembly is not in this playtest yet.' });
		}

		return fail(404, { message: 'Unavailable' });
	},

	toggleFavorite: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const itemId = formData.get('itemId');
		const favorited = formData.get('favorited') === 'true';

		if (typeof itemId !== 'string' || itemId.length === 0) {
			return fail(400, { message: 'Missing item' });
		}

		try {
			const updated = await setItemFavoriteForPilot(db, { pilotId, itemId, favorited });
			if (favorited) {
				await trackItemFavorited(db, pilotId, { itemId, schematicId: updated.schematicId });
			} else {
				await trackItemUnfavorited(db, pilotId, { itemId, schematicId: updated.schematicId });
			}
		} catch (error) {
			if (error instanceof WorkshopItemNotFoundError) {
				return fail(404, { message: 'Prototype not found' });
			}
			if (error instanceof WorkshopSliceItemValidationError) {
				return fail(400, { message: error.message });
			}
			throw error;
		}

		return {
			...(await refreshWorkshopScreen(db, pilotId, event.url))
		};
	},

	reclaimItem: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const itemId = formData.get('itemId');
		const idempotencyKey = formData.get('idempotencyKey');
		const confirmFavorited = formData.get('confirmFavorited') === 'true';

		const previewed = formData.get('previewed') === 'true';

		if (typeof itemId !== 'string' || itemId.length === 0) {
			return fail(400, { message: 'Missing item' });
		}
		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing reclaim idempotency key' });
		}

		if (previewed) {
			await trackItemReclaimPreviewed(db, pilotId, { itemId });
		}

		try {
			const outcome = await reclaimWorkshopItemForPilot(db, {
				pilotId,
				itemId,
				idempotencyKey,
				confirmFavorited
			});

			if (outcome.status === 'reclaimed') {
				await trackItemReclaimed(db, pilotId, {
					itemId,
					returnedResources: outcome.returnedResources
				});
			}
		} catch (error) {
			if (error instanceof WorkshopItemNotFoundError) {
				return fail(404, { message: 'Prototype not found' });
			}
			if (error instanceof WorkshopReclaimValidationError) {
				return fail(400, { message: error.message });
			}
			if (error instanceof WorkshopSliceItemValidationError) {
				return fail(400, { message: error.message });
			}
			throw error;
		}

		return {
			...(await refreshWorkshopScreen(db, pilotId, event.url))
		};
	},

	openCrate: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		await requirePlayablePilot(db, pilotId);

		const formData = await event.request.formData();
		const crateId = formData.get('crateId');
		const idempotencyKey = formData.get('idempotencyKey');

		if (typeof crateId !== 'string' || crateId.length === 0) {
			return fail(400, { message: 'Missing crate' });
		}
		if (typeof idempotencyKey !== 'string' || idempotencyKey.length === 0) {
			return fail(400, { message: 'Missing crate idempotency key' });
		}

		try {
			const outcome = await openWorkshopCrateForPilot(db, {
				pilotId,
				crateId,
				idempotencyKey
			});

			if (outcome.status === 'opened') {
				await trackSupplyCrateOpened(db, pilotId, {
					crateId: outcome.crate.id,
					reason: outcome.crate.reason,
					payload: outcome.crate.payload
				});
			}
		} catch (error) {
			if (error instanceof WorkshopCrateNotFoundError) {
				return fail(404, { message: 'Crate not found' });
			}
			if (error instanceof WorkshopCrateUnavailableError) {
				return fail(400, { message: error.message });
			}
			throw error;
		}

		return {
			...(await refreshWorkshopScreen(db, pilotId, event.url))
		};
	}
};
