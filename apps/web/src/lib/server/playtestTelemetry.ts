import {
	countPlaytestEventsByName,
	getPlaytestEventOnce,
	recordPlaytestEvent,
	recordPlaytestEventOnce,
	type PlaytestEventPayload
} from '@async-frontier-mmo/db';
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

export async function trackWorkshopViewed(
	db: Db,
	pilotId: string,
	input: { selectedSchematicId: string }
): Promise<void> {
	await once(db, pilotId, 'schematic_opened', {
		schematicId: input.selectedSchematicId
	});
}

export async function trackCraftCommitted(
	db: Db,
	pilotId: string,
	_input: { schematicId: string; craftMode: string; itemDisplayName: string }
): Promise<void> {
	// Slice funnel uses rig_assembled / turn-in events; no Decision 013 craft duplicates.
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
	input: {
		targetResourceId: string;
		extractionTailMinutes: number;
		tutorialRun: 1 | 2 | null;
	}
): Promise<void> {
	if (input.tutorialRun === 1) {
		await once(db, pilotId, 'first_deploy', input);
		return;
	}

	if (input.tutorialRun !== null) {
		return;
	}

	const asyncChosen = await getPlaytestEventOnce(db, pilotId, 'async_duration_chosen');
	if (asyncChosen) {
		await once(db, pilotId, 'second_deploy_voluntary', input);
	}
}

export async function trackSliceEventWindowResolved(
	db: Db,
	pilotId: string,
	input: { windowIndex: number; chosenResponse: string; complication: string }
): Promise<void> {
	// spec requires one event PER window resolution, not just once ever
	await recordPlaytestEvent(db, { pilotId, eventName: 'event_window_resolved', payload: input });
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

async function repeat(
	db: Db,
	pilotId: string,
	eventName: Parameters<typeof recordPlaytestEvent>[1]['eventName'],
	payload?: PlaytestEventPayload
) {
	await recordPlaytestEvent(db, { pilotId, eventName, payload });
}

export async function trackFieldSampleCompleted(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'field_sample_completed', payload);
}

export async function trackNextActionResolved(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'next_action_resolved', payload);
}

export async function trackDeployAttempted(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'deploy_attempted', payload);
}

export async function trackActiveRunPanelRendered(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'active_run_panel_rendered', payload);
}

export async function trackRigEventResponseSubmitted(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'rig_event_response_submitted', payload);
}

export async function trackWorkshopStationViewed(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'workshop_station_viewed', payload);
}

export async function trackTutorialRecoveryState(
	db: Db,
	pilotId: string,
	payload: PlaytestEventPayload
): Promise<void> {
	await repeat(db, pilotId, 'tutorial_recovery_state', payload);
}
