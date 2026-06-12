import type { ResourceStatCode } from 'shared';

/** Map of stat code → value (1–1000). Partial for open-ended inputs; bloom resources use CompleteResourceStatMap. */
export type ResourceStatMap = Partial<Record<ResourceStatCode, number>>;

export { buildCraftResultExplanation } from './crafting/buildCraftResultExplanation.js';
export {
	buildResourceAllocationHints,
	stackSlotFitScore,
	type InventoryStackWithStats,
	type StackAllocationHint
} from './crafting/buildResourceAllocationHints.js';
export {
	analyzeSchematicReadiness,
	type OwnedResourceStack,
	type SchematicReadinessAnalysis,
	type SchematicSlotReadiness
} from './crafting/schematicReadiness.js';
export {
	analyzeChassisAssemblyReadiness,
	validateChassisAssembly,
	type ChassisAssemblyReadiness,
	type ChassisSlotReadiness,
	type OwnedThumperPart
} from './crafting/chassisAssembly.js';
export {
	THUMPER_CHASSIS_ASSEMBLY,
	type ChassisAssemblyDefinition,
	type ChassisAssemblySlotId
} from './crafting/schematics/thumperChassisAssembly.js';
export {
	availableQuantityForSlot,
	canFillSlotWithStack,
	reservedQuantityForInstance
} from './crafting/craftSlotAllocation.js';
export type {
	CraftPropertyDriver,
	CraftPropertyExplanation,
	CraftResultExplanation
} from './crafting/buildCraftResultExplanation.js';
export { FIRST_SCANNER_SUGGESTED_TUNING } from './crafting/schematics/surveyScannerMkI.js';
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
	canRestoreConditionWithFieldRepair,
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
	generateBloom,
	LIFESPAN_DAYS_MAX,
	LIFESPAN_DAYS_MIN,
	RESOURCES_PER_FAMILY,
	type GeneratedBloom,
	type GeneratedBloomResource
} from './resources/bloomGenerator.js';
export {
	FAMILY_STAT_CAPS,
	MVP_RESOURCE_STAT_CODES,
	resourceStatsWithinFamilyCaps
} from './resources/familyStatCaps.js';
export {
	getRedMesaResource,
	listRedMesaResources,
	RED_MESA_BLOOM_RESOURCES
} from './resources/redMesaBloom';
export {
	deemphasizedStatsForLiveSchematics,
	deemphasizedStatsForSlotFamily,
	liveSchematicStatWeights,
	schematicStatWeightsForSlotFamily
} from './crafting/liveSchematicStatWeights.js';
export {
	buildActiveBloomSurvey,
	isDeemphasizedSurveyStat,
	type ActiveBloomSurveyResource,
	type ActiveBloomSurveyResult,
	type ActiveBloomSurveySignal
} from './survey/activeBloomSurvey.js';
export {
	DEPOSIT_SPOT_CAPACITY_MAX_UNITS,
	DEPOSIT_SPOT_CAPACITY_MIN_UNITS,
	DEPOSIT_SPOT_YIELD_BAND_LABELS,
	depositSpotCapacityUnits,
	depositSpotRemainingUnits,
	depositSpotYieldBand,
	depositSpotYieldBandLabel,
	type DepositSpotYieldBand
} from './survey/depositSpotCapacity.js';
export {
	accrueEnergy,
	applyProspectingScannerWear,
	concentrationPercentToExtractionMultiplier,
	createEmptyPilotSurveyProgress,
	DEFAULT_PROJECTED_RECOVERY as PROSPECTING_DEFAULT_PROJECTED_RECOVERY,
	FAMILY_SCAN_ENERGY_COST,
	findDepositSpot,
	formatDepositSpotId,
	generateDepositSpots,
	presentDepositSpotYield,
	presentResourceStatsForPilot,
	projectedRecoveryWithConcentration,
	resolveSurveyEnergy,
	SAMPLE_ENERGY_COST,
	SAMPLE_TRICKLE_UNITS,
	sampleYieldFromConcentration,
	buildFamilyScanPreview,
	scanFamilyProspect,
	sampleDepositSpot,
	PROSPECTING_CYCLE_SCATTER_LINE,
	SURVEY_ENERGY_CAP,
	unsampledSpotConcentrationBand,
	type DepositSpot,
	type DepositSpotYieldPresentation,
	type FamilyScanResourceView,
	type PilotSurveyProgress,
	type SampleDepositSpotResult,
	type SurveyEnergyState
} from './survey/prospectingSampling.js';
export {
	concentrationAt,
	depositSpotAtTile,
	getTopology,
	parseTopologySpotId,
	resolveDepositSpot,
	PLAYER_SPAWN_X,
	PLAYER_SPAWN_Y,
	spotIdFor,
	TOPOLOGY_GRID_HEIGHT,
	TOPOLOGY_GRID_WIDTH,
	type DepositTopology
} from './survey/depositTopology.js';
export { buildFieldMapView, type FieldMapCell, type FieldMapView } from './field/buildFieldMapView.js';
export {
	discoveryPatchAround,
	fieldTileKey,
	fieldViewportBounds,
	mergeDiscoveredTiles,
	parseFieldTileKey,
	type FieldViewportBounds
} from './field/fieldDiscovery.js';
export {
	surveyEnergyOutlook,
	type SurveyEnergyOutlook
} from './survey/surveyEnergyOutlook.js';
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
export {
	bindOrderOnFirstSample,
	boundStackProgress,
	missionTrackerState,
	pickActiveSettlementOrder,
	type FamilyStackCandidate,
	type MissionTrackerState
} from './settlement/orderBinding.js';
export { SETTLEMENT_MILESTONES, type SettlementMilestoneKey } from './settlement/milestones.js';
export type { SettlementOrder, SettlementOrderStatus } from './settlement/types.js';
export {
	ENERGY_CAP_SAMPLES,
	ENERGY_REGEN_SAMPLES_PER_HOUR,
	EVENT_WINDOW_FIRE_CHANCE,
	EVENT_WINDOW_SLOTS,
	HULL_CEILING_EXPONENT,
	HULL_TIER_BASE,
	PATCHED_HULL_INTEGRITY,
	RUN_TAILS_MINUTES,
	SAMPLE_BASE_YIELD,
	SAMPLE_DURATION_SECONDS,
	SCAVENGED_HULL_INTEGRITY,
	SPOT_SAMPLE_POOL,
	TUTORIAL_ORDER_CM_STACK,
	TUTORIAL_ORDER_SA_STACK,
	TUTORIAL_RUN_1_MINUTES,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	TUTORIAL_RUN_2_MINUTES,
	TUTORIAL_RUN_2_YIELD,
	type HullTier
} from './tuning.js';
export { createSeededRng, hashSeedToUint32 } from './rng.js';
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
	ACTIVE_PHASE_SECONDS,
	buildActiveRunMeters,
	buildDeployPreview,
	computeDeployProjectedRecovery,
	effectiveExtractionTailYieldMultiplier,
	EXTRACTION_TAIL_OPTIONS,
	extractionTailYieldMultiplier,
	parseExtractionTailMinutes,
	TUTORIAL_EXTRACTION_TAIL_OPTION,
	TUTORIAL_EXTRACTION_TAIL_OPTION_5M,
	projectedRecoveryForStoredRun,
	totalRunDurationSeconds,
	type ActiveRunMeterPreview,
	type DeployPreview,
	type DeployRunMeterPreview,
	type ExtractionTailId
} from './thumper/deployPreview.js';
export {
	buildGearYieldPenaltySummary,
	type GearYieldPenaltySummary
} from './thumper/gearYieldPenalty.js';
export {
	complicationDisplayName,
	eventActionLabel,
	frameFlavoredActionLabel,
	COMPLICATION_DISPLAY_NAMES
} from './thumper/eventActionLabels.js';
export {
	buildThumperClaimResultExplanation,
	type ThumperClaimResultExplanation,
	type ThumperPartWearExplanationLine,
	type ThumperWindowExplanationLine
} from './thumper/buildThumperClaimResultExplanation.js';
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
export {
	COMPLICATION_METER_MATCHING_RESTORE,
	COMPLICATION_METER_ONSET,
	computeEventWindowProjectedMetrics,
	computeRecallForfeitedRecovery,
	describeEventWindowStakes,
	formatEventWindowOutcomeLine,
	resolveEventWindowOutcome,
	type EventWindowMeterSnapshot,
	type EventWindowOutcome,
	type EventWindowProjectedMetrics,
	type EventWindowStakeOption
} from './thumper/eventWindowOutcome.js';
export {
	HOLD_PENALTY_BY_SEVERITY,
	MATCHING_ACTION_WEAR_CONDITION,
	MATCHING_ACTION_WEAR_PART_SLOT,
	rollEventWindowSeverity,
	parseEventWindowSeverity,
	holdPenaltyForSeverity,
	type EventWindowSeverity
} from './thumper/eventWindowSeverity.js';
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
export { availableTails, maxRunMinutes, type AvailableTailOption } from './thumper/hullRunCeiling.js';
export {
	computeHullFailsafeProrata,
	effectiveThumperRunDurationSeconds,
	hullMaxRunSeconds,
	isHullFailsafeActive,
	type HullFailsafeProrata,
	type HullFailsafeRecallReason
} from './thumper/hullFailsafeRecall.js';
export {
	FIRST_SESSION_PROJECTED_RECOVERY,
	FIRST_SESSION_SCANNER_MINIMUM,
	resolveFirstSessionThumperRunResult
} from './thumper/resolveFirstSessionThumperRunResult';
export {
	isThumperPartSchematic,
	THUMPER_PART_SCHEMATIC_IDS,
	thumperPartSlotForSchematic
} from './thumper/thumperPartSchematics.js';
export {
	applyWearToRunParts,
	computeRunPartWearDeltas,
	computeThumperPartRunModifiers,
	partConditionPerformanceMultiplier,
	pumpRecoveryBonusFromEfficiency,
	type ThumperEventWindowWearInput
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
export {
	overallThumperCondition,
	getPartConditionBand,
	getConditionColorClass,
	type OverallThumperCondition,
	type ThumperConditionBand
} from './thumper/overallThumperCondition.js';
export type {
	ThumperComplicationId,
	ThumperEventActionId,
	ThumperEventWindow,
	ThumperEventWindowPlan,
	ThumperQuietWindow,
	ThumperSafetyChoiceId,
	ThumperScheduledWindow
} from './thumper/types';
export {
	EVENT_WINDOW_TRIGGER_PROBABILITY
} from './thumper/types';
export {
	TUTORIAL_STEPS,
	isScriptedTutorialThumperStep,
	isTutorialStep,
	tutorialNextActionScreen,
	type TutorialScreenId,
	type TutorialStep
} from './tutorial/tutorialSteps.js';