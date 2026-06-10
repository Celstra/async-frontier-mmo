import type { ResourceStatCode } from 'shared';
import { getRedMesaResource } from '../resources/redMesaBloom.js';
import type { NamedResourceId } from '../resources/types.js';
import { getStatBand } from './statBand.js';
import { applySurveyClarityToResult, type SurveyScannerEquipment } from './surveyClarity.js';
import type { RedMesaSurveyResult, SurveySignal, SurveyStatHint } from './types.js';

const FIRST_SESSION_SIGNAL_IDS = [
	'keth_iron',
	'veyrith_copper',
	'thornwake_crystal'
] as const satisfies readonly NamedResourceId[];

const RECOMMENDED_RESOURCE_ID = 'veyrith_copper' as const satisfies NamedResourceId;

const TEACHING_NOTES: Record<(typeof FIRST_SESSION_SIGNAL_IDS)[number], string> = {
	keth_iron: 'Reliable structural baseline — a safe default for early crafts.',
	veyrith_copper:
		'Very strong Conductivity — an excellent first target for Survey Scanner Module Mk I.',
	thornwake_crystal: 'High Conductivity with harsh tradeoffs — tempting specialist, risky choice.'
};

/** Stat keys that sell each resource's first-session teaching personality. */
const SURVEY_STAT_HINTS: Record<(typeof FIRST_SESSION_SIGNAL_IDS)[number], ResourceStatCode[]> = {
	keth_iron: ['hardness', 'conductivity', 'OQ'],
	veyrith_copper: ['conductivity', 'hardness', 'OQ'],
	thornwake_crystal: ['conductivity', 'heat_resistance', 'malleability']
};

function buildStatHints(resourceId: (typeof FIRST_SESSION_SIGNAL_IDS)[number]): SurveyStatHint[] {
	const resource = getRedMesaResource(resourceId);

	return SURVEY_STAT_HINTS[resourceId].map((stat) => ({
		stat,
		band: getStatBand(resource.stats[stat])
	}));
}

function buildSignal(resourceId: (typeof FIRST_SESSION_SIGNAL_IDS)[number]): SurveySignal {
	const resource = getRedMesaResource(resourceId);

	return {
		resourceId,
		displayName: resource.displayName,
		family: resource.family,
		teachingNote: TEACHING_NOTES[resourceId],
		statHints: buildStatHints(resourceId),
		recommended: resourceId === RECOMMENDED_RESOURCE_ID
	};
}

function buildFirstSessionSurveyBase(): RedMesaSurveyResult {
	return {
		regionId: 'red_mesa',
		signals: FIRST_SESSION_SIGNAL_IDS.map(buildSignal),
		recommendedResourceId: RECOMMENDED_RESOURCE_ID
	};
}

/**
 * First-session onboarding survey — deterministic, Decision 011.
 * Optional equipped scanner improves information quality (bands → exact values), not resource stats.
 */
export function surveyRedMesaFirstSession(
	equipment?: SurveyScannerEquipment | null
): RedMesaSurveyResult {
	const base = buildFirstSessionSurveyBase();
	if (!equipment || equipment.surveyClarityScore <= 0) {
		return base;
	}

	return applySurveyClarityToResult(base, equipment.surveyClarityScore);
}
