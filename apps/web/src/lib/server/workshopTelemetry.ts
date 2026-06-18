import type { CraftResultExplanation } from '@async-frontier-mmo/domain';
import {
	countCompletedCraftsForSchematic,
	hasCraftedEachWorkshopThumperPart,
	listCompletedWorkshopSchematicIdsForPilot,
	recordCraftStartedOnce,
	recordPlaytestEvent,
	recordPlaytestEventOnce
} from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';
import {
	trackCraftResultAbandoned,
	trackCraftResultCompareClicked,
	trackCraftResultCraftAnotherClicked,
	trackCraftResultPulseViewed,
	trackCraftResultRevealSeen,
	trackItemFavorited,
	trackItemReclaimPreviewed,
	trackItemReclaimed,
	trackItemUnfavorited,
	trackOverdriveCritScrapSeen,
	trackSupplyCrateAvailable,
	trackSupplyCrateOpened,
	trackWorkshopStationViewed,
	trackWorkshopViewed
} from './playtestTelemetry.js';

type Db = ReturnType<typeof getGameDb>;

async function once(
	db: Db,
	pilotId: string,
	eventName: Parameters<typeof recordPlaytestEventOnce>[1]['eventName'],
	payload?: Record<string, unknown>
) {
	await recordPlaytestEventOnce(db, { pilotId, eventName, payload });
}

async function repeat(
	db: Db,
	pilotId: string,
	eventName: Parameters<typeof recordPlaytestEvent>[1]['eventName'],
	payload?: Record<string, unknown>
) {
	await recordPlaytestEvent(db, { pilotId, eventName, payload });
}

export async function trackWorkshopSliceSessionStarted(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'workshop_started');
}

export type StarterResourceStackTelemetry = {
	resourceInstanceId: string;
	resourceSlug: string;
	family: string;
	quantity: number;
	stats: Record<string, number>;
};

export async function trackStarterResourcesViewed(
	db: Db,
	pilotId: string,
	payload: {
		stackCount: number;
		totalUnits: number;
		stacks: StarterResourceStackTelemetry[];
	}
): Promise<void> {
	await once(db, pilotId, 'starter_resources_viewed', payload);
}

export async function trackSchematicSelected(
	db: Db,
	pilotId: string,
	payload: { schematicId: string }
): Promise<void> {
	await repeat(db, pilotId, 'schematic_selected', payload);
}

export async function trackResourceSlotFilled(
	db: Db,
	pilotId: string,
	payload: {
		schematicId: string;
		slotId: string;
		resourceInstanceId: string;
		resourceSlug: string;
		stats: Record<string, number>;
	}
): Promise<void> {
	await repeat(db, pilotId, 'resource_slot_filled', payload);
}

export async function trackResourceSlotReplaced(
	db: Db,
	pilotId: string,
	payload: {
		schematicId: string;
		slotId: string;
		fromResourceInstanceId: string;
		toResourceInstanceId: string;
		toResourceSlug: string;
		stats: Record<string, number>;
	}
): Promise<void> {
	await repeat(db, pilotId, 'resource_slot_replaced', payload);
}

export async function trackTuningChanged(
	db: Db,
	pilotId: string,
	payload: { schematicId: string; allocation: Record<string, number> }
): Promise<void> {
	await repeat(db, pilotId, 'tuning_changed', payload);
}

export async function trackExperimentPulseConfigured(
	db: Db,
	pilotId: string,
	payload: {
		schematicId: string;
		pulseIndex: number;
		propertyId: string;
		push: string;
	}
): Promise<void> {
	await repeat(db, pilotId, 'experiment_pulse_configured', payload);
}

export async function trackCraftStarted(
	db: Db,
	pilotId: string,
	payload: { schematicId: string; craftMode: string; idempotencyKey: string }
): Promise<void> {
	await recordCraftStartedOnce(db, { pilotId, payload });
}

function compactPulseOutcomes(explanation: CraftResultExplanation) {
	return (explanation.experimentPulseResults ?? []).map((pulse) => ({
		pulseIndex: pulse.pulseIndex,
		propertyId: pulse.propertyId,
		push: pulse.push,
		outcome: pulse.outcome,
		scrapUnits: pulse.scrapUnits
	}));
}

export async function trackCraftCompleted(
	db: Db,
	pilotId: string,
	input: {
		schematicId: string;
		craftMode: string;
		item: {
			id: string;
			propertyScores: Record<string, number>;
			hasMinorFlaw: boolean;
		};
		explanation: CraftResultExplanation;
	}
): Promise<void> {
	const priorCount = await countCompletedCraftsForSchematic(db, pilotId, input.schematicId);

	await repeat(db, pilotId, 'craft_completed', {
		itemId: input.item.id,
		schematicId: input.schematicId,
		craftMode: input.craftMode,
		propertyScores: input.item.propertyScores,
		pulseOutcomes: compactPulseOutcomes(input.explanation),
		scrapUnits: input.explanation.experimentScrapUnits ?? 0,
		hasMinorFlaw: input.item.hasMinorFlaw
	});

	if (priorCount > 1) {
		await repeat(db, pilotId, 'repeat_same_schematic', {
			schematicId: input.schematicId,
			completedCraftCount: priorCount
		});
	}

	if (await hasCraftedEachWorkshopThumperPart(db, pilotId)) {
		await once(db, pilotId, 'crafted_each_thumper_part', {
			schematicIds: await listCompletedWorkshopSchematicIdsForPilot(db, pilotId)
		});
	}
}

export async function trackResultCompared(
	db: Db,
	pilotId: string,
	payload: Record<string, unknown>
): Promise<void> {
	await repeat(db, pilotId, 'result_compared', payload);
	await trackCraftResultCompareClicked(db, pilotId, payload);
}

export async function trackNoCraftableResourcesState(db: Db, pilotId: string): Promise<void> {
	await repeat(db, pilotId, 'no_craftable_resources_state');
}

export async function trackMissionPanelSeen(db: Db, pilotId: string): Promise<void> {
	await once(db, pilotId, 'mission_panel_seen');
}

export async function trackFirstSocketCtaClicked(
	db: Db,
	pilotId: string,
	payload: { schematicId: string; slotId: string }
): Promise<void> {
	await repeat(db, pilotId, 'first_socket_cta_clicked', payload);
}

export async function trackSlotHintSeen(
	db: Db,
	pilotId: string,
	payload: { schematicId: string; slotId: string }
): Promise<void> {
	await repeat(db, pilotId, 'slot_hint_seen', payload);
}

export async function trackSafeToExperimentNudgeSeen(
	db: Db,
	pilotId: string,
	payload: { schematicId: string; itemId: string }
): Promise<void> {
	await repeat(db, pilotId, 'safe_to_experiment_nudge_seen', payload);
}

export async function trackExperimentAfterSafeCraft(
	db: Db,
	pilotId: string,
	payload: { schematicId: string; itemId?: string }
): Promise<void> {
	await repeat(db, pilotId, 'experiment_after_safe_craft', payload);
}

export async function trackCratePanelOpenedBeforeFirstCraft(
	db: Db,
	pilotId: string,
	payload: { crateId: string }
): Promise<void> {
	await repeat(db, pilotId, 'crate_panel_opened_before_first_craft', payload);
}

export {
	trackCraftResultAbandoned,
	trackCraftResultCraftAnotherClicked,
	trackCraftResultPulseViewed,
	trackCraftResultRevealSeen,
	trackItemFavorited,
	trackItemReclaimPreviewed,
	trackItemReclaimed,
	trackItemUnfavorited,
	trackOverdriveCritScrapSeen,
	trackSupplyCrateAvailable,
	trackSupplyCrateOpened,
	trackWorkshopStationViewed,
	trackWorkshopViewed
};
