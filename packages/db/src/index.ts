/** Persistence layer — Drizzle schema and queries. */
export { createDb, type Db, type DbExecutor } from './client.js';
export { ensureDemoPilot, getPilotById, getPilotFrame } from './queries/pilots.js';
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
	listResourceStacksForPilot
} from './queries/resourceGrants.js';
export { BLOOM_ONE_ID, BLOOM_ONE_SEED_RESOURCES } from './seed/bloomOneSeed.js';
export { economyLedger } from './schema/economyLedger.js';
export { pilots } from './schema/pilots.js';
export { resourceInstances } from './schema/resourceInstances.js';
export { resourceStacks } from './schema/resourceStacks.js';
export { thumperEventWindows } from './schema/thumperEventWindows.js';
export { thumperRunResults } from './schema/thumperRunResults.js';
export { thumperRuns } from './schema/thumperRuns.js';
