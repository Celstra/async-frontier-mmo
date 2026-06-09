import type { ResourceStatCode } from 'shared';
import type { NamedResourceId, ResourceFamily } from '../resources/types.js';
import type { StatBand } from './statBand.js';

export type SurveyStatHint = {
	stat: ResourceStatCode;
	band: StatBand;
};

export type SurveySignal = {
	resourceId: NamedResourceId;
	displayName: string;
	family: ResourceFamily;
	teachingNote: string;
	statHints: SurveyStatHint[];
	recommended: boolean;
};

export type RedMesaSurveyResult = {
	regionId: 'red_mesa';
	signals: SurveySignal[];
	recommendedResourceId: NamedResourceId;
};
