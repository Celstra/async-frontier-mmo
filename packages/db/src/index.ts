/** Persistence layer — Drizzle schema and queries. */
export { createDb, type Db, type DbExecutor } from './client.js';
export {
	craftSchematicForPilot,
	craftSurveyScannerForPilot,
	CraftValidationError,
	type CraftSchematicInput,
	type CraftSchematicOutcome
} from './queries/crafting.js';
export {
	applyRepairKitToItemForPilot,
	craftFieldRepairKitForPilot,
	countFieldRepairKitsForPilot,
	FieldRepairKitUnavailableError,
	recordThumperEventWindowResponseForPilot,
	type RecordThumperResponseOutcome
} from './queries/fieldRepair.js';
export {
	applyRunWearToPartItems,
	getRunHullItemForRepair,
	getThumperRunPartSnapshots,
	partModifiersFromRunSnapshots,
	snapshotEquippedPartsForRun
} from './queries/thumperRunParts.js';
export {
	equipThumperPartForPilot,
	ensureStarterThumperPartsForPilot,
	getEquippedThumperPartsForPilot,
	listThumperPartItemsForPilot,
	backfillTutorialPatchedHullCondition,
	patchEquippedHullForTutorial,
	ThumperPartEquipValidationError,
	type EquipThumperPartOutcome
} from './queries/thumperPartEquipment.js';
export {
	ensureDemoPilot,
	ensureDemoPilotReady,
	ensurePilotGameReady,
	ensureSessionPilot,
	getPilotById
} from './queries/pilots.js';
export { listPilotResourceStacksWithInstances } from './queries/pilotInventory.js';
export { consumeResourceFromPilotTx, InsufficientResourceError } from './queries/resourceConsumes.js';
export {
	equipScannerItemForPilot,
	EquipValidationError,
	getEquippedScannerForPilot,
	listScannerItemsForPilot,
	type EquipScannerOutcome
} from './queries/scannerEquipment.js';
export {
	bindSettlementOrdersOnSample,
	clearPilotSettlementState,
	deliverResourceStackToSettlementOrder,
	ensureNextNeedOrdersPostedForPilot,
	ensureSettlementBootstrapForPilot,
	fabricatorTutorialOrdersFullyBound,
	getActiveSettlementMilestoneKey,
	getSettlementMilestoneUnlockedAt,
	getSettlementOrderById,
	listOpenSettlementOrdersForPilot,
	listSettlementOrdersForMilestone,
	type DeliverStackToSettlementOrderOutcome
} from './queries/settlement.js';
export {
	accrueAndPersistSurveyEnergy,
	ensurePilotSurveyEnergyRow,
	persistSurveyEnergyAt,
	resolveStoredSurveyEnergy,
	type PersistedSurveyEnergy
} from './queries/surveyEnergy.js';
export {
	clearPilotTutorialState,
	getPilotTutorialStep,
	setPilotTutorialStep
} from './queries/tutorialState.js';
export { craftingAttempts, type CraftSlotSelection } from './schema/craftingAttempts.js';
export { items, type CraftSlotProvenance } from './schema/items.js';
export {
	getThumperEventWindowsForRun,
	insertThumperEventWindows,
	recordThumperEventWindowResponse
} from './queries/thumperEventWindows.js';
export {
	claimThumperRun,
	getAnyTutorialRunDeployTarget,
	getClaimedTutorialRunDeployTarget,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	hasPilotClaimedTutorialRun,
	hasPilotCompletedTutorialThumper,
	insertThumperRun
} from './queries/thumperRuns.js';
export {
	DepositSpotExhaustedError,
	DepositSpotStaleError,
	formatDepositSpotDrainAdjustment,
	getDepositSpotYieldState,
	loadDepositSpotYieldMap,
	parseDepositSpotDrainAdjustment,
	seedDepositSpotRemainingUnits,
	yieldPresentationMap,
	type DepositSpotYieldState,
	type DrainDepositSpotOnClaimResult
} from './queries/depositSpotYields.js';
export {
	claimOpenThumperRunForPilot,
	deployThumperRunWithEventWindows,
	type ClaimResourceReward,
	type ClaimThumperRunOutcome,
	type ThumperRunResultPayload
} from './queries/thumperRunWorkflow.js';
export {
	mapStoredWindowsToResolutionSnapshots,
	mapStoredWindowsToResponses,
	resolveThumperRunForStoredWindows
} from './queries/thumperRunResolution.js';
export {
	acknowledgeThumperRunResult,
	getThumperRunResultForRun,
	insertThumperRunResult
} from './queries/thumperRunResults.js';
export { ECONOMY_LEDGER_EVENT_TYPES, type EconomyLedgerEventType } from './economy/eventTypes.js';
export {
	listEconomyLedgerEntriesForPilot,
	listEconomyLedgerEntriesForStack
} from './queries/economyLedger.js';
export {
	ensureBloomOneResourceInstances,
	getActiveBloomId,
	getResourceInstanceByBloomSlug,
	getResourceInstanceById,
	incrementResourceInstanceProspectingCycle,
	listAllResourceDisplayNames,
	listResourceInstancesForBloom,
	listSpawnableResourceInstances,
	ResourceInstanceStatsImmutableError,
	resourceInstanceToSurveyResource,
	updateResourceInstance
} from './queries/resourceInstances.js';
export {
	getBloomRecord,
	rotateActiveBloom,
	type RotateBloomOutcome
} from './queries/bloomRotation.js';
export {
	clearPilotFieldPendingSample,
	discoverPilotFieldTiles,
	ensurePilotFieldSession,
	getPilotFieldSession,
	hasPilotResourceStatReveal,
	listPilotRevealedResourceInstanceIds,
	listPilotWaypointSamples,
	movePilotOnField,
	scanPilotFieldTile,
	setPilotFieldFamily,
	setPilotFieldPosition,
	setPilotFieldResource,
	startPilotFieldSample,
	type PilotFieldSession
} from './queries/fieldSession.js';
export {
	clearPilotProspectingState,
	getPilotDepositSample,
	getPilotProspectingProgress,
	hasPilotFamilyScan,
	previewFamilyScanForPilot,
	sampleSpotForPilot,
	samplesTakenOnSpot,
	scanFamilyForPilot,
	type PilotProspectingProgress,
	type PreviewFamilyScanForPilotInput,
	type SampleSpotForPilotInput,
	type SampleSpotForPilotOutcome,
	type ScanFamilyForPilotInput,
	type ScanFamilyForPilotOutcome,
	type SurveyResourceCard
} from './queries/prospecting.js';
export {
	getResourceStackForPilotInstance,
	grantResourceToPilot,
	listResourceStacksForPilot,
	type GrantResourceInput
} from './queries/resourceGrants.js';
export { BLOOM_ONE_ID, BLOOM_ONE_SEED_RESOURCES } from './seed/bloomOneSeed.js';
export { economyLedger } from './schema/economyLedger.js';
export { pilots } from './schema/pilots.js';
export { resourceInstances } from './schema/resourceInstances.js';
export { resourceStacks } from './schema/resourceStacks.js';
export { thumperEventWindows } from './schema/thumperEventWindows.js';
export { thumperRunResults } from './schema/thumperRunResults.js';
export { repairActions } from './schema/repairActions.js';
export { thumperRunPartSnapshots } from './schema/thumperRunPartSnapshots.js';
export { thumperRuns } from './schema/thumperRuns.js';
export { depositSpotYields } from './schema/depositSpotYields.js';
export { pilotDepositSpotSamples } from './schema/pilotDepositSpotSamples.js';
export { pilotFamilyScans } from './schema/pilotFamilyScans.js';
export { pilotResourceStatReveals } from './schema/pilotResourceStatReveals.js';
export { pilotSurveyEnergy } from './schema/pilotSurveyEnergy.js';
export { pilotFieldState } from './schema/pilotFieldState.js';
export { pilotTutorialState } from './schema/pilotTutorialState.js';
export { settlementMilestones } from './schema/settlementMilestones.js';
export { settlementOrders } from './schema/settlementOrders.js';
export {
	LEGACY_PLAYTEST_EVENTS,
	PLAYTEST_COMPREHENSION_EVENTS,
	PLAYTEST_EVENT_NAMES,
	PLAYTEST_FUNNEL_EVENTS,
	SLICE_FUNNEL_EVENTS,
	isPlaytestEventName,
	type PlaytestEventName
} from './playtest/eventNames.js';
export {
	countPilotDepositSamples,
	countPilotFamilyScans,
	countPlaytestEventsByName,
	getPlaytestEventOnce,
	getLatestPlaytestEventCreatedAt,
	listMissionOrderNudgeShownIds,
	listPlaytestEventsForPilot,
	recordMissionOrderNudgeShown,
	recordPlaytestEvent,
	recordPlaytestEventOnce,
	type PlaytestEventPayload
} from './queries/playtestTelemetry.js';
export { playtestEvents } from './schema/playtestEvents.js';
