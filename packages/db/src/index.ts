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
	ThumperPartEquipValidationError,
	type EquipThumperPartOutcome
} from './queries/thumperPartEquipment.js';
export { ensureDemoPilot, ensureDemoPilotReady, getPilotById, getPilotFrame } from './queries/pilots.js';
export { listPilotResourceStacksWithInstances } from './queries/pilotInventory.js';
export { consumeResourceFromPilotTx, InsufficientResourceError } from './queries/resourceConsumes.js';
export {
	equipScannerItemForPilot,
	EquipValidationError,
	getEquippedScannerForPilot,
	listScannerItemsForPilot,
	type EquipScannerOutcome
} from './queries/scannerEquipment.js';
export { ensureStarterStockpileForPilot, hasStarterStockpileGrant } from './queries/starterStockpile.js';
export { craftingAttempts, type CraftSlotSelection } from './schema/craftingAttempts.js';
export { items, type CraftSlotProvenance } from './schema/items.js';
export {
	getThumperEventWindowsForRun,
	insertThumperEventWindows,
	recordThumperEventWindowResponse
} from './queries/thumperEventWindows.js';
export {
	claimThumperRun,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	hasPilotCompletedTutorialThumper,
	insertThumperRun
} from './queries/thumperRuns.js';
export {
	claimOpenThumperRunForPilot,
	deployThumperRunWithEventWindows,
	type ClaimResourceReward,
	type ClaimThumperRunOutcome,
	type ThumperRunResultPayload
} from './queries/thumperRunWorkflow.js';
export {
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
	getResourceInstanceByBloomSlug,
	getResourceInstanceById,
	insertResourceInstance,
	listResourceInstancesForBloom,
	ResourceInstanceStatsImmutableError,
	updateResourceInstance
} from './queries/resourceInstances.js';
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
