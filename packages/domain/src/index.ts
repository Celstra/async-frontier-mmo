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
export { generateFirstSessionEventWindows } from './thumper/generateFirstSessionEventWindows';
export {
	FIRST_SESSION_PROJECTED_RECOVERY,
	FIRST_SESSION_SCANNER_MINIMUM,
	resolveFirstSessionThumperRunResult
} from './thumper/resolveFirstSessionThumperRunResult';
export type {
	ThumperEventWindowResponse,
	ThumperRunResult,
	ThumperWindowChosenResponse
} from './thumper/resolveFirstSessionThumperRunResult';
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