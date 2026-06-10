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
export { pilots } from './schema/pilots.js';
export { thumperEventWindows } from './schema/thumperEventWindows.js';
export { thumperRunResults } from './schema/thumperRunResults.js';
export { thumperRuns } from './schema/thumperRuns.js';
