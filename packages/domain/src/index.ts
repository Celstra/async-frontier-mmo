import type { ResourceStatCode } from 'shared';

/** Map of stat code → value (1–1000). Partial for open-ended inputs; bloom resources use CompleteResourceStatMap. */
export type ResourceStatMap = Partial<Record<ResourceStatCode, number>>;

export {
	getRedMesaResource,
	listRedMesaResources,
	MVP_RESOURCE_STAT_CODES,
	RED_MESA_BLOOM_RESOURCES
} from './resources/redMesaBloom';
export { surveyRedMesaFirstSession } from './survey/redMesaSurvey';
export { getStatBand } from './survey/statBand';
export type { RedMesaSurveyResult, SurveySignal, SurveyStatHint } from './survey/types';
export type { StatBand } from './survey/statBand';
export type {
	CompleteResourceStatMap,
	NamedResourceDefinition,
	NamedResourceId,
	ResourceFamily
} from './resources/types';
export { assertVeyrithTutorialWindowsReady } from './thumper/assertVeyrithTutorialWindowsReady';
export type { TutorialWindowRow } from './thumper/assertVeyrithTutorialWindowsReady';
export {
	COMPLICATION_MATCHING_ACTION,
	getMatchingAction,
	THUMPER_EVENT_ACTIONS,
	THUMPER_SAFETY_CHOICES
} from './thumper/complicationActions';
export {
	THUMPER_COMPLICATIONS,
	THUMPER_COMPLICATION_TABLE
} from './thumper/complicationTable';
export { generateFirstSessionEventWindows } from './thumper/generateFirstSessionEventWindows';
export {
	DEFAULT_PROJECTED_RECOVERY,
	DEFAULT_RUN_WINDOW_COUNT,
	generateSeededThumperEventWindows,
	PUSH_RUN_PROJECTED_RECOVERY,
	PUSH_RUN_WINDOW_COUNT,
	type SeededThumperRunPlan
} from './thumper/generateSeededThumperEventWindows';
export {
	generateThumperEventWindows,
	TUTORIAL_RUN_SEED,
	type ThumperRunWindowPlan
} from './thumper/generateThumperEventWindows';
export {
	FIELD_REPAIR_REQUIRES_KIT_REASON,
	getEventWindowResponseOptions,
	type ThumperWindowResponseOption,
	type ThumperWindowResponseOptionId
} from './thumper/getEventWindowResponseOptions';
export { assertRecallResponseAudit } from './thumper/assertRecallResponseAudit';
export { isTutorialThumperDeploy } from './thumper/isTutorialThumperDeploy';
export {
	validateEventWindowRespondOrder,
	type EventWindowRow
} from './thumper/validateEventWindowRespondOrder';
export {
	validateEventWindowResponse,
	type EventWindowResponseValidation
} from './thumper/validateEventWindowResponse';
export { createSeededRng, hashSeedToUint32 } from './thumper/seededRng';
export { getFrameMatchingBonusRecovery, FRAME_MATCHING_BONUS_RECOVERY } from './thumper/frameActionEffects';
export {
	FIRST_SESSION_PROJECTED_RECOVERY,
	FIRST_SESSION_SCANNER_MINIMUM,
	resolveFirstSessionThumperRunResult
} from './thumper/resolveFirstSessionThumperRunResult';
export {
	resolveThumperRunResult,
	type ThumperEventWindowResponse,
	type ThumperEventWindowSnapshot,
	type ThumperRunConfig,
	type ThumperRunResolutionType,
	type ThumperRunResult,
	type ThumperWindowChosenResponse
} from './thumper/resolveThumperRunResult';
export {
	isThumperRunClaimable,
	isThumperRunReadyToResolve,
	type ThumperClaimWindowSnapshot
} from './thumper/isThumperRunClaimable';
export {
	resolveThumperState,
	type ResolveThumperStateInput,
	type ResolveThumperStateResult
} from './thumper/resolveThumperState';
export type {
	ThumperComplicationId,
	ThumperEventActionId,
	ThumperEventWindow,
	ThumperEventWindowPlan,
	ThumperSafetyChoiceId
} from './thumper/types';