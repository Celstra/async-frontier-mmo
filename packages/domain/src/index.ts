import type { ResourceStatCode } from 'shared';

/** Map of stat code → value (1–1000). Partial for open-ended inputs; bloom resources use CompleteResourceStatMap. */
export type ResourceStatMap = Partial<Record<ResourceStatCode, number>>;

export { buildCraftResultExplanation } from './crafting/buildCraftResultExplanation.js';
export type {
	CraftPropertyDriver,
	CraftPropertyExplanation,
	CraftResultExplanation
} from './crafting/buildCraftResultExplanation.js';
export {
	CRAFT_QUANTITY_PER_SLOT,
	FIRST_SCANNER_SUGGESTED_TUNING,
	STARTER_STOCKPILE_GRANTS
} from './crafting/starterStockpile.js';
export {
	CAREFUL_EXPERIMENT_BOOST,
	CAREFUL_EXPERIMENT_BOOST_CHANCE,
	CAREFUL_EXPERIMENT_FLAW_CHANCE,
	CAREFUL_EXPERIMENT_UNCHANGED_CHANCE,
	computePropertyBaseScore,
	computeTunedPropertyScore,
	getResourcePropertyCeiling,
	previewCraftProperties,
	PROPERTY_SCORE_CAP,
	resolveCraft,
	SchematicSlotValidationError,
	TUNING_BOOST_PER_POINT,
	TUNING_POINTS_TOTAL,
	TuningValidationError,
	validateCraftTuningAllocation,
	validateSchematicSlotFills,
	validateTuningAllocation,
	type ResolveCraftInput
} from './crafting/schematicEngine.js';
export { getPropertyOutputBand } from './crafting/propertyBand.js';
export {
	applyNormalRepair,
	applyRoutineUse,
	applySevereEvent,
	createItemDurability,
	getMaxCondition,
	isItemDisabled
} from './durability/itemDurability.js';
export type { ItemDurability, SevereDurabilityEvent } from './durability/types.js';
export {
	applyFieldRepairWithKit,
	applyHullDamageFieldRepair,
	applyHullDamageWithoutFieldRepair,
	conditionRestoredPointsFromKitScore,
	HULL_DAMAGE_WITHOUT_FIELD_REPAIR,
	integrityLossMitigatedFromSafetyScore,
	type FieldRepairKitScores,
	type FieldRepairOutcome
} from './durability/fieldRepair.js';
export {
	BASIC_DRILL_HEAD,
	EFFICIENT_PUMP,
	FIELD_REPAIR_KIT,
	FIRST_REPAIR_KIT_SUGGESTED_TUNING,
	MVP_CRAFT_SCHEMATICS,
	MVP_SCHEMATIC_BY_ID,
	MVP_THUMPER_PART_SCHEMATICS,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I
} from './crafting/schematics/index.js';
export type {
	CarefulExperimentOutcome,
	CraftMode,
	CraftPropertyPreview,
	CraftResolution,
	PropertyOutputBand,
	PropertyPreviewLine,
	ResolvedPropertyLine,
	SchematicDefinition,
	SchematicPropertyLine,
	SchematicSlotDefinition,
	SchematicSlotFill,
	SchematicWeightTerm,
	TuningAllocation
} from './crafting/types.js';
export {
	getRedMesaResource,
	listRedMesaResources,
	MVP_RESOURCE_STAT_CODES,
	RED_MESA_BLOOM_RESOURCES
} from './resources/redMesaBloom';
export { surveyRedMesaFirstSession } from './survey/redMesaSurvey';
export {
	applySurveyClarityToResult,
	exactStatHintCountForSurveyClarity
} from './survey/surveyClarity.js';
export type { SurveyScannerEquipment } from './survey/surveyClarity.js';
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
	STARTER_WORN_THUMPER_PARTS,
	THUMPER_PART_SCHEMATIC_IDS,
	WORN_BASIC_DRILL,
	WORN_BASIC_HULL,
	WORN_BASIC_PUMP,
	isThumperPartSchematic,
	thumperPartSlotForSchematic
} from './thumper/starterWornParts.js';
export {
	applyWearToRunParts,
	computeRunPartWearDeltas,
	computeThumperPartRunModifiers,
	partConditionPerformanceMultiplier,
	pumpRecoveryBonusFromEfficiency
} from './thumper/thumperPartModifiers.js';
export {
	THUMPER_PART_SLOTS,
	type ThumperPartRunModifiers,
	type ThumperPartSnapshot,
	type ThumperPartSlot,
	type ThumperPartWearDelta
} from './thumper/thumperPartTypes.js';
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