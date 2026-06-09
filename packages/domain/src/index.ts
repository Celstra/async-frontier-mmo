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
export {
	resolveThumperState,
	type ResolveThumperStateInput,
	type ResolveThumperStateResult
} from './thumper/resolveThumperState';