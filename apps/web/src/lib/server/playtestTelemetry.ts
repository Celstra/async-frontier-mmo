import {
	countPilotDepositSamples,
	countPlaytestEventsByName,
	recordPlaytestEvent,
	recordPlaytestEventOnce,
	type PlaytestEventPayload
} from '@async-frontier-mmo/db';
import type { SchematicDefinition, TuningAllocation } from '@async-frontier-mmo/domain';
import { WORKSHOP_SUGGESTED_TUNING } from './workshopLoad.js';
import type { getGameDb } from './gameDb.js';

type Db = ReturnType<typeof getGameDb>;

async function once(
	db: Db,
	pilotId: string,
	eventName: Parameters<typeof recordPlaytestEventOnce>[1]['eventName'],
	payload?: PlaytestEventPayload
) {
	await recordPlaytestEventOnce(db, { pilotId, eventName, payload });
}

export async function trackFrameChosen(
	db: Db,
	pilotId: string,
	frameId: string
): Promise<void> {
	await once(db, pilotId, 'frame_chosen', { frameId });
}

export async function trackFamilyScanCompleted(
	db: Db,
	pilotId: string,
	input: {
		family: string;
		resourceCount: number;
		recommendedResourceSlug: string | null;
	}
): Promise<void> {
	// Count scan actions, not unique pilot_family_scans rows — repeat scans of the same
	// family (e.g. after equipping a better scanner) still close the loop.
	const scanActionsBefore = await countPlaytestEventsByName(db, pilotId, 'first_survey_started');

	await recordPlaytestEvent(db, {
		pilotId,
		eventName: 'first_survey_started',
		payload: { family: input.family, scanAction: scanActionsBefore + 1 }
	});

	if (scanActionsBefore === 0) {
		await once(db, pilotId, 'first_survey_completed', { family: input.family });
	} else if (scanActionsBefore === 1) {
		await once(db, pilotId, 'second_survey_completed', { family: input.family });
	}

	if (input.resourceCount >= 2) {
		await once(db, pilotId, 'signal_compared', {
			family: input.family,
			resourceCount: input.resourceCount
		});
	}

	if (input.recommendedResourceSlug === 'veyrith_copper') {
		await once(db, pilotId, 'veyrith_copper_recommended', {
			family: input.family
		});
	}
}

export async function trackSampleSpotCompleted(
	db: Db,
	pilotId: string,
	input: {
		resourceSlug: string;
		statsRevealedThisSample: boolean;
	}
): Promise<void> {
	if (input.statsRevealedThisSample) {
		await recordPlaytestEvent(db, {
			pilotId,
			eventName: 'resource_stats_inspected',
			payload: { resourceSlug: input.resourceSlug }
		});
		await once(db, pilotId, 'first_stat_reveal_viewed', {
			resourceSlug: input.resourceSlug
		});
	}
}

export async function trackDeployScreenViewed(
	db: Db,
	pilotId: string,
	input: {
		resourceSlug: string;
		resourceInstanceId: string;
		spotId: string;
		extractionTailMinutes: number;
	}
): Promise<void> {
	await once(db, pilotId, 'target_signal_selected', {
		resourceSlug: input.resourceSlug,
		resourceInstanceId: input.resourceInstanceId,
		spotId: input.spotId
	});

	const sampleCount = await countPilotDepositSamples(db, pilotId);
	if (sampleCount > 0) {
		await recordPlaytestEvent(db, {
			pilotId,
			eventName: 'spots_sampled_before_deploy',
			payload: { sampleCount, resourceSlug: input.resourceSlug }
		});
	}

	if (input.extractionTailMinutes !== 60) {
		await recordPlaytestEvent(db, {
			pilotId,
			eventName: 'extraction_tail_chosen',
			payload: { extractionTailMinutes: input.extractionTailMinutes }
		});
	}
}

export async function trackThumperDeployed(
	db: Db,
	pilotId: string,
	input: {
		targetResourceId: string;
		isTutorialRun: boolean;
		extractionTailMinutes: number;
	}
): Promise<void> {
	await once(db, pilotId, 'thumper_deployed', {
		targetResourceId: input.targetResourceId,
		isTutorialRun: input.isTutorialRun,
		extractionTailMinutes: input.extractionTailMinutes
	});
}

export async function trackEventWindowResolved(
	db: Db,
	pilotId: string,
	windowIndex: number,
	input: { chosenResponse: string; complication: string }
): Promise<void> {
	const eventName =
		windowIndex === 1
			? 'event_window_1_resolved'
			: windowIndex === 2
				? 'event_window_2_resolved'
				: null;
	if (!eventName) {
		return;
	}

	await once(db, pilotId, eventName, input);
}

export async function trackThumperClaimed(
	db: Db,
	pilotId: string,
	input: { thumperRunId: string; recoveredQuantity: number }
): Promise<void> {
	await once(db, pilotId, 'thumper_claimed', input);
}

export async function trackResourceClaimed(
	db: Db,
	pilotId: string,
	input: {
		resourceSlug: string;
		resourceInstanceId: string;
		quantityGranted: number;
	}
): Promise<void> {
	await once(db, pilotId, 'resource_claimed', input);
}

function tuningDiffersFromSuggested(
	schematic: SchematicDefinition,
	tuning: TuningAllocation
): boolean {
	const suggested = WORKSHOP_SUGGESTED_TUNING[schematic.id] ?? {};
	return schematic.properties.some(
		(property) => (tuning[property.id] ?? 0) !== (suggested[property.id] ?? 0)
	);
}

function slotSelectionsDifferFromDefaults(
	schematic: SchematicDefinition,
	inventory: Array<{ resourceInstanceId: string; resourceSlug: string; family: string }>,
	selections: Record<string, string>
): boolean {
	for (const slot of schematic.slots) {
		const stacks = inventory.filter((row) => row.family === slot.requiredFamily);
		let defaultId = stacks[0]?.resourceInstanceId ?? '';
		if (slot.id === 'conductive_core') {
			defaultId =
				stacks.find((row) => row.resourceSlug === 'veyrith_copper')?.resourceInstanceId ?? defaultId;
		} else if (slot.id === 'crystal_lens') {
			defaultId =
				stacks.find((row) => row.resourceSlug === 'pale_ember_crystal')?.resourceInstanceId ??
				defaultId;
		} else if (slot.id === 'frame_mount') {
			defaultId =
				stacks.find((row) => row.resourceSlug === 'keth_iron')?.resourceInstanceId ?? defaultId;
		}

		const selected = selections[slot.id];
		if (selected && defaultId && selected !== defaultId) {
			return true;
		}
	}

	return false;
}

export async function trackWorkshopViewed(
	db: Db,
	pilotId: string,
	input: {
		selectedSchematicId: string;
		allocationHintCount: number;
		inventory: Array<{ resourceInstanceId: string; resourceSlug: string; family: string }>;
		schematic: SchematicDefinition;
		slotSelections: Record<string, string>;
		tuning: TuningAllocation;
		tuningTotal: number;
		allSlotsFilled: boolean;
	}
): Promise<void> {
	await once(db, pilotId, 'schematic_opened', {
		schematicId: input.selectedSchematicId
	});

	if (input.allocationHintCount >= 2) {
		await recordPlaytestEvent(db, {
			pilotId,
			eventName: 'two_resources_compared',
			payload: { resourceCount: input.allocationHintCount }
		});
	}

	if (slotSelectionsDifferFromDefaults(input.schematic, input.inventory, input.slotSelections)) {
		await recordPlaytestEvent(db, {
			pilotId,
			eventName: 'slot_selection_changed',
			payload: { schematicId: input.selectedSchematicId }
		});
	}

	if (tuningDiffersFromSuggested(input.schematic, input.tuning)) {
		await recordPlaytestEvent(db, {
			pilotId,
			eventName: 'tuning_allocation_changed',
			payload: { schematicId: input.selectedSchematicId, tuning: input.tuning }
		});
	}

	if (input.allSlotsFilled) {
		await once(db, pilotId, 'resource_slots_filled', {
			schematicId: input.selectedSchematicId
		});
	}
}

export async function trackCraftCommitted(
	db: Db,
	pilotId: string,
	input: {
		schematicId: string;
		craftMode: string;
		itemDisplayName: string;
	}
): Promise<void> {
	await once(db, pilotId, 'resource_slots_filled', { schematicId: input.schematicId });
	await once(db, pilotId, 'craft_mode_chosen', {
		schematicId: input.schematicId,
		craftMode: input.craftMode
	});
	await once(db, pilotId, 'tuning_points_spent', { schematicId: input.schematicId });
	await once(db, pilotId, 'item_crafted', {
		schematicId: input.schematicId,
		displayName: input.itemDisplayName
	});
}

export async function trackItemEquipped(
	db: Db,
	pilotId: string,
	input: { itemKind: 'scanner' | 'thumper_part'; displayName: string; slot?: string }
): Promise<void> {
	await once(db, pilotId, 'item_equipped', input);
}

export async function trackFieldFamilyChosen(db: Db, pilotId: string, family: string): Promise<void> {
	await once(db, pilotId, 'first_family_chosen', { family });
}

export async function trackFieldTileScan(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'first_scan');
}

export async function trackFieldMove(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'first_move');
}

export async function trackFieldSampleCommit(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'first_sample');
}

export async function trackFieldStatReveal(
	db: Db,
	pilotId: string,
	resourceSlug: string
): Promise<void> {
	await once(db, pilotId, 'first_stat_reveal', { resourceSlug });
}

export async function trackFieldDeploy(
	db: Db,
	pilotId: string,
	input: { targetResourceId: string; extractionTailMinutes: number; isTutorialRun: boolean }
): Promise<void> {
	await once(db, pilotId, 'first_deploy', input);
	await trackThumperDeployed(db, pilotId, input);
	if (!input.isTutorialRun) {
		await once(db, pilotId, 'second_deploy_voluntary', input);
	}
}

export async function trackSliceEventWindowResolved(
	db: Db,
	pilotId: string,
	input: { windowIndex: number; chosenResponse: string; complication: string }
): Promise<void> {
	await once(db, pilotId, 'event_window_resolved', input);
	await trackEventWindowResolved(db, pilotId, input.windowIndex, {
		chosenResponse: input.chosenResponse,
		complication: input.complication
	});
}

export async function trackFieldFirstClaim(
	db: Db,
	pilotId: string,
	input: { recoveredQuantity: number }
): Promise<void> {
	await once(db, pilotId, 'first_claim', input);
}

export async function trackSettlementTurnIn(
	db: Db,
	pilotId: string,
	input: { orderId: string; resourceInstanceId: string; deliveredUnits: number; orderFilled: boolean }
): Promise<void> {
	await once(db, pilotId, 'turn_in_completed', input);
}

export async function trackFabricatorOnlineSeen(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'fabricator_online_seen');
}

export async function trackRigAssembled(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'rig_assembled');
}

export async function trackPrologueDone(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'prologue_done');
}

export async function trackSecondFamilyStarted(db: Db, pilotId: string, family: string): Promise<void> {
	await once(db, pilotId, 'second_family_started', { family });
}

export async function trackAsyncDurationChosen(
	db: Db,
	pilotId: string,
	input: { extractionTailMinutes: number }
): Promise<void> {
	await once(db, pilotId, 'async_duration_chosen', input);
}

export async function trackReturnVisitIfDue(
	db: Db,
	pilotId: string,
	latestEventAt: Date
): Promise<void> {
	const gapMs = Date.now() - latestEventAt.getTime();
	if (gapMs < 4 * 60 * 60 * 1000) {
		return;
	}

	await once(db, pilotId, 'return_visit', {
		gapHours: Math.round(gapMs / (60 * 60 * 1000))
	});
}
