import {
	BLOOM_ONE_ID,
	clearPilotFieldPendingSample,
	discoverPilotFieldTiles,
	ensurePilotFieldSession,
	scanPilotFieldTile,
	getActiveBloomId,
	getBloomRecord,
	getDepositSpotYieldState,
	getEquippedScannerForPilot,
	backfillTutorialPatchedHullCondition,
	getEquippedThumperPartsForPilot,
	countFieldRepairKitsForPilot,
	getLatestThumperRunForPilot,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	samplesTakenOnSpot,
	getPilotDepositSample,
	getPilotProspectingProgress,
	getResourceInstanceById,
	getPilotTutorialStep,
	getPlaytestEventOnce,
	getActiveSettlementMilestoneKey,
	hasPilotClaimedTutorialRun,
	hasPilotFamilyScan,
	listPilotWaypointSamples,
	getTutorialLockedDeployTarget,
	listSettlementOrdersForMilestone,
	listThumperPartItemsForPilot,
	previewFamilyScanForPilot,
	hasPilotResourceStatReveal,
	sampleSpotForPilot,
	type SampleSpotForPilotOutcome
} from '@async-frontier-mmo/db';
import { fieldStatsFromInstance, type FieldResourceStats } from '$lib/field/resourceStats';
import {
	availableTails,
	buildFieldMapView,
	preferredExtractionTailMinutes,
	getTopology,
	isThumperRunClaimable,
	parseTopologySpotId,
	hullDeployWarningLine,
	hullTierFromIntegrity,
	SPOT_SAMPLE_POOL,
	spotIdFor,
	SURVEY_ENERGY_CAP,
	surveyEnergyOutlook,
	TOPOLOGY_GRID_HEIGHT,
	TOPOLOGY_GRID_WIDTH,
	TUTORIAL_EXTRACTION_TAIL_OPTION,
	TUTORIAL_EXTRACTION_TAIL_OPTION_5M,
	TUTORIAL_RUN_1_SEED,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	TUTORIAL_RUN_2_YIELD,
	tutorialDeployForStep,
	tutorialRunFromSeed,
	isTutorialRunSeed,
	REINFORCED_HULL_PLATE,
	pickPinnedMissionOrder,
	tutorialFieldFamilyDefault,
	isTutorialDeployLockedStep,
	TUTORIAL_DEPLOY_LOCKED_BANNER,
	TUTORIAL_DEPLOY_LOCKED_REASON,
	TUTORIAL_SECOND_DEPLOY_LOCKED_LINE,
	tutorialDeployWaivesSpotExhaustion,
	validateTutorialDeployTarget,
	type NamedResourceId,
	type ResourceFamily
} from '@async-frontier-mmo/domain';
import { activeBloomDisplayName } from '$lib/bloomDisplay';
import {
	FIELD_MODE_LINE,
	SAME_WAYPOINT_DEPLOY_HINT,
	THUMP_TARGET_RESOURCE_SLUG,
	parseFieldFamily,
	tutorialRecommendResourceSlug
} from '$lib/field/constants';
import { loadDeployPreviewForPilot } from '$lib/server/fieldDeployLoad.js';
import { loadClaimScreen } from '$lib/server/fieldClaimState.js';
import { loadOpenRunState } from '$lib/server/fieldRunState.js';
import {
	trackFieldStatReveal,
	trackFieldSampleCompleted,
	trackTutorialRecoveryState,
	trackActiveRunPanelRendered
} from '$lib/server/playtestTelemetry.js';
import {
	maybeAdvanceHuntingToTurnIn,
	maybeAdvanceToFirstDeployAfterRigAssembly
} from '$lib/server/tutorialOrchestration.js';
import { resolveTargetDisplayName } from '$lib/server/targetResource.js';
import {
	loadActiveOrderStatusLine,
	loadActiveOrderTelemetrySnapshot,
	loadSettlementMissionTicker
} from '$lib/server/settlementLoad.js';
import type { getGameDb } from './gameDb.js';
import {
	deployPreviewFirstAsyncWaiverActive,
	firstAsyncUnlockForEquippedHull,
	firstAsyncWaiverActiveForRun,
	loadFirstAsyncTailState
} from './firstAsyncTailState.js';

const WATCHED_RUN_MAX_SECONDS = 5 * 60;

export type FieldLastSampleResult = {
	resourceDisplayName: string;
	trickleQuantity: number;
	trueConcentrationPercent: number;
	energyCost: number;
	surveyEnergyAfter: number;
	surveyEnergyCap: number;
	statsRevealedThisSample: boolean;
	yieldBandLabel: string;
	stats: FieldResourceStats | null;
	orderStatusLine: string | null;
};

function isRigDeployReady(
	equipped: Awaited<ReturnType<typeof getEquippedThumperPartsForPilot>>
): boolean {
	return equipped.drill !== null && equipped.pump !== null && equipped.hull !== null;
}

function deployBlockedReason(input: {
	rigReady: boolean;
	spotRemainingUnits: number;
	hasOpenRun: boolean;
	tailOptionCount: number;
	tutorialStep: string | null;
	tutorialDeployRun: ReturnType<typeof tutorialDeployForStep>;
}): string | null {
	if (!input.rigReady) {
		return 'Assemble your rig in WORKSHOP before deploying';
	}
	if (input.hasOpenRun) {
		return 'You already have an open thumper run';
	}
	if (input.spotRemainingUnits <= 0 && !tutorialDeployWaivesSpotExhaustion(input.tutorialDeployRun)) {
		return 'This deposit is exhausted';
	}

	if (input.tutorialStep && input.tutorialStep !== 'done' && input.tutorialDeployRun === null) {
		if (input.tutorialStep === 'hunting' || input.tutorialStep === 'turn_in') {
			return 'Turn in your foreman orders at SETTLEMENT, assemble the rig in WORKSHOP, then deploy';
		}
		if (input.tutorialStep === 'fabricator_online') {
			return 'Return to SETTLEMENT — dismiss the fabricator briefing, then deploy from FIELD';
		}
		if (input.tutorialStep === 'assemble_rig') {
			return 'Assemble your rig in WORKSHOP before deploying';
		}
		if (input.tutorialStep === 'recall_lesson') {
			return 'Return to SETTLEMENT — acknowledge the recall briefing before deploying again';
		}
		if (input.tutorialStep === 'hull_patch') {
			return 'Return to SETTLEMENT — foreman needs to patch your hull before the next deploy';
		}
		return 'Foreman has another job for you before the next deploy';
	}

	if (input.tailOptionCount === 0) {
		return 'Hull integrity too low for any run duration — patch or craft a better hull';
	}

	return null;
}

function tileKey(x: number, y: number): string {
	return `${x},${y}`;
}

async function completePendingSampleIfDue(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now: Date
): Promise<SampleSpotForPilotOutcome | null> {
	const session = await ensurePilotFieldSession(db, pilotId, now);
	if (!session.pendingSample || session.pendingSample.completesAt > now) {
		return null;
	}

	const outcome = await sampleSpotForPilot(db, {
		pilotId,
		resourceInstanceId: session.pendingSample.resourceInstanceId,
		spotId: session.pendingSample.spotId,
		now
	});

	await clearPilotFieldPendingSample(db, pilotId, now);

	const coords = parseTopologySpotId(session.pendingSample.spotId);
	if (coords) {
		await scanPilotFieldTile(db, { pilotId, x: coords.x, y: coords.y, now });
		await discoverPilotFieldTiles(db, { pilotId, x: coords.x, y: coords.y, now });
	}

	return outcome;
}

export async function loadFieldScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	now = new Date()
) {
	const sessionBefore = await ensurePilotFieldSession(db, pilotId, now);
	const pendingResourceId = sessionBefore.pendingSample?.resourceInstanceId ?? null;
	const orderBeforeSample = await loadActiveOrderTelemetrySnapshot(db, pilotId);
	const sampleOutcome = await completePendingSampleIfDue(db, pilotId, now);
	let session = await ensurePilotFieldSession(db, pilotId, now);
	let lastSampleResult: FieldLastSampleResult | null = null;
	let sampleFlash: string | null = null;

	const exhaustedSampleMessage =
		'Surface remnants exhausted here — nothing left to hand-sample. Deploy a thumper to tap the deposit.';

	if (sampleOutcome?.status === 'insufficient_energy') {
		sampleFlash = 'Not enough survey energy to sample here';
	} else if (sampleOutcome?.status === 'family_scan_required') {
		sampleFlash = 'Scan family before sampling here';
	} else if (
		sampleOutcome?.status === 'spot_pool_exhausted' ||
		sampleOutcome?.status === 'spot_already_sampled'
	) {
		sampleFlash = exhaustedSampleMessage;
	} else if (sampleOutcome?.status === 'ok' && pendingResourceId) {
		const resource = await getResourceInstanceById(db, pendingResourceId);
		if (resource) {
			await maybeAdvanceHuntingToTurnIn(db, pilotId);

			if (sampleOutcome.statsRevealedThisSample) {
				await trackFieldStatReveal(db, pilotId, resource.resourceSlug);
			}

			const orderAfterSample = await loadActiveOrderTelemetrySnapshot(db, pilotId);

			await trackFieldSampleCompleted(db, pilotId, {
				resourceSlug: resource.resourceSlug,
				resourceInstanceId: pendingResourceId,
				statsRevealedThisSample: sampleOutcome.statsRevealedThisSample,
				trickleQuantity: sampleOutcome.trickleQuantity,
				trueConcentrationPercent: sampleOutcome.trueConcentrationPercent,
				energyCost: sampleOutcome.energyCost,
				surveyEnergyAfter: sampleOutcome.surveyEnergy,
				surveyEnergyCap: SURVEY_ENERGY_CAP,
				orderId: orderAfterSample?.orderId ?? orderBeforeSample?.orderId ?? null,
				orderFamily: orderAfterSample?.family ?? orderBeforeSample?.family ?? null,
				orderProgressBefore: orderBeforeSample?.progressUnits ?? null,
				orderProgressAfter: orderAfterSample?.progressUnits ?? null,
				orderStackSize: orderAfterSample?.stackSize ?? orderBeforeSample?.stackSize ?? null,
				orderDeliveredUnitsBefore: orderBeforeSample?.deliveredUnits ?? null,
				orderDeliveredUnitsAfter: orderAfterSample?.deliveredUnits ?? null,
				orderFilledBefore: orderBeforeSample?.orderFilled ?? null,
				orderFilledAfter: orderAfterSample?.orderFilled ?? null
			});

			const showStats =
				sampleOutcome.statsRevealedThisSample ||
				(await hasPilotResourceStatReveal(db, {
					pilotId,
					resourceInstanceId: pendingResourceId
				}));

			const orderStatusLine = await loadActiveOrderStatusLine(db, pilotId);

			lastSampleResult = {
				resourceDisplayName: resource.displayName,
				trickleQuantity: sampleOutcome.trickleQuantity,
				trueConcentrationPercent: sampleOutcome.trueConcentrationPercent,
				energyCost: sampleOutcome.energyCost,
				surveyEnergyAfter: sampleOutcome.surveyEnergy,
				surveyEnergyCap: SURVEY_ENERGY_CAP,
				statsRevealedThisSample: sampleOutcome.statsRevealedThisSample,
				yieldBandLabel: sampleOutcome.yieldBandLabel,
				stats: showStats ? fieldStatsFromInstance(resource) : null,
				orderStatusLine
			};
		}
	}
	const [activeBloomId, missionTickerBase] = await Promise.all([
		getActiveBloomId(db),
		loadSettlementMissionTicker(db, pilotId)
	]);
	let missionTicker = missionTickerBase;
	const milestoneKey = await getActiveSettlementMilestoneKey(db, pilotId);
	let ownsReinforcedHullPlate = false;
	if (milestoneKey === 'next_need') {
		const thumperParts = await listThumperPartItemsForPilot(db, pilotId);
		ownsReinforcedHullPlate = thumperParts.some(
			(part) => part.schematicId === REINFORCED_HULL_PLATE.id
		);
		if (!ownsReinforcedHullPlate) {
			const hullBill =
				'HULL: 100 Structural Alloy + 20 Reactive Crystal (RC order 12u is part of the hull bill)';
			missionTicker = hullBill;
		}
	}
	let tutorialStep = await getPilotTutorialStep(db, pilotId);
	await maybeAdvanceToFirstDeployAfterRigAssembly(db, pilotId);
	await backfillTutorialPatchedHullCondition(db, pilotId);
	tutorialStep = await getPilotTutorialStep(db, pilotId);
	const hasCompletedTutorial = await hasPilotClaimedTutorialRun(db, pilotId, TUTORIAL_RUN_1_SEED);
	const tutorialDeployRun = tutorialDeployForStep(tutorialStep);
	const prospectingProgress = await getPilotProspectingProgress(db, pilotId, now, activeBloomId);
	const surveyEnergyOutlookData = surveyEnergyOutlook({
		storedEnergy: prospectingProgress.surveyEnergy,
		lastUpdatedAtMs: prospectingProgress.lastEnergyUpdatedAtMs,
		nowMs: now.getTime()
	});

	const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });
	const openRun = await getOpenThumperRunForPilot(db, pilotId);
	const claimScreen = await loadClaimScreen(db, pilotId, now);
	const claimView = claimScreen.mode === 'none' ? null : claimScreen;
	let shouldPoll = false;

	const settlementOrders = await listSettlementOrdersForMilestone(db, { pilotId, milestoneKey });
	const pinnedOrder = pickPinnedMissionOrder(settlementOrders, milestoneKey);
	const selectedFamily = tutorialFieldFamilyDefault({
		tutorialStep,
		pinnedOrder,
		sessionFamily: session.selectedFamily,
		fallback: 'conductive_metal'
	});
	const lockedTutorialTarget = isTutorialDeployLockedStep(tutorialStep)
		? await getTutorialLockedDeployTarget(db, { pilotId, bloomId: activeBloomId })
		: null;
	const hasFamilyScan = await hasPilotFamilyScan(db, {
		pilotId,
		bloomId: activeBloomId,
		family: selectedFamily
	});
	const recommendedResourceSlug = await (async () => {
		const milestoneKey = await getActiveSettlementMilestoneKey(db, pilotId);
		if (milestoneKey === 'next_need' && !ownsReinforcedHullPlate) {
			return null;
		}
		const orders = await listSettlementOrdersForMilestone(db, { pilotId, milestoneKey });
		const pinned = pickPinnedMissionOrder(orders, milestoneKey);
		return tutorialRecommendResourceSlug({
			hasCompletedTutorial,
			tutorialStep,
			activeOrderFamily: pinned?.family ?? null
		});
	})();

	const preview = hasFamilyScan
		? await previewFamilyScanForPilot(db, {
				pilotId,
				family: selectedFamily,
				recommendedResourceSlug
			})
		: null;

	const resources =
		preview?.resources.map((resource) => ({
			...resource,
			recommended: resource.resourceSlug === recommendedResourceSlug,
			recommendLabel:
				resource.resourceSlug === recommendedResourceSlug ? '[RECOMMENDED]' : null
		})) ?? [];

	let mapView = null;
	let deployContext = null;
	let hereSpotId: string | null = null;
	let pendingSampleProgress: {
		startedAt: string;
		completesAt: string;
		progressPercent: number;
	} | null = null;
	let handSamplesLeft: { taken: number; pool: number } | null = null;

	if (session.pendingSample) {
		const elapsed = now.getTime() - session.pendingSample.startedAt.getTime();
		const total =
			session.pendingSample.completesAt.getTime() - session.pendingSample.startedAt.getTime();
		pendingSampleProgress = {
			startedAt: session.pendingSample.startedAt.toISOString(),
			completesAt: session.pendingSample.completesAt.toISOString(),
			progressPercent: Math.min(100, Math.round((elapsed / total) * 100))
		};
		shouldPoll = shouldPoll || session.pendingSample.completesAt > now;
	}

	if (session.resourceInstanceId) {
		const resourceInstanceId = session.resourceInstanceId;

		if (session.discoveredTiles.length === 0) {
			session = await discoverPilotFieldTiles(db, {
				pilotId,
				x: session.positionX,
				y: session.positionY,
				now
			});
		}

		const resource = await getResourceInstanceById(db, resourceInstanceId);
		if (resource) {
			const topology = getTopology(resourceInstanceId, {
				minPercent: resource.concentrationMinPercent,
				maxPercent: resource.concentrationMaxPercent
			});

			const waypointRows = await listPilotWaypointSamples(db, {
				pilotId,
				bloomId: activeBloomId
			});
			const waypointTiles = new Set<string>();
			for (const row of waypointRows) {
				if (row.resourceInstanceId !== resourceInstanceId) {
					continue;
				}
				const coords = parseTopologySpotId(row.spotId);
				if (coords) {
					waypointTiles.add(tileKey(coords.x, coords.y));
				}
			}

			const discoveredTiles = new Set([
				...session.discoveredTiles,
				...waypointRows
					.filter((row) => row.resourceInstanceId === resourceInstanceId)
					.flatMap((row) => {
						const coords = parseTopologySpotId(row.spotId);
						return coords ? [tileKey(coords.x, coords.y)] : [];
					})
			]);

			mapView = buildFieldMapView({
				topology,
				playerX: session.positionX,
				playerY: session.positionY,
				discoveredTiles,
				scannedTiles: new Set(session.scannedTiles),
				waypointTiles
			});

			hereSpotId = spotIdFor(resourceInstanceId, session.positionX, session.positionY);
			if (hereSpotId) {
				const samplesTaken = await samplesTakenOnSpot(db, { pilotId, spotId: hereSpotId });
				handSamplesLeft = {
					taken: samplesTaken,
					pool: SPOT_SAMPLE_POOL
				};
			}
			const sample = await getPilotDepositSample(db, {
				pilotId,
				resourceInstanceId,
				spotId: hereSpotId
			});

			if (sample) {
				const bloom = await getBloomRecord(db, resource.bloomId);
				const bloomGenerationSeed =
					bloom?.generationSeed ?? `red-mesa-bloom-${resource.bloomId}`;
				const spotYield = await getDepositSpotYieldState(db, {
					spotId: hereSpotId,
					resourceInstanceId,
					generationSeed: bloomGenerationSeed
				});

				const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
				const hullIntegrity = equipped.hull?.integrity ?? 100;
				const hullTier = hullTierFromIntegrity(hullIntegrity);
				const isTutorialRun = tutorialDeployRun !== null;
				const thumperParts = await listThumperPartItemsForPilot(db, pilotId);
				const ownsHullPlate = thumperParts.some(
					(part) => part.schematicId === REINFORCED_HULL_PLATE.id
				);
				const tailOptions =
					tutorialDeployRun === 1
						? [
								{
									id: TUTORIAL_EXTRACTION_TAIL_OPTION.id,
									label: TUTORIAL_EXTRACTION_TAIL_OPTION.label,
									minutes: TUTORIAL_EXTRACTION_TAIL_OPTION.minutes
								}
							]
						: tutorialDeployRun === 2
							? [
									{
										id: TUTORIAL_EXTRACTION_TAIL_OPTION_5M.id,
										label: TUTORIAL_EXTRACTION_TAIL_OPTION_5M.label,
										minutes: TUTORIAL_EXTRACTION_TAIL_OPTION_5M.minutes
									}
								]
							: availableTails(hullTier, hullIntegrity, {
									unlockFirstAsyncTail: firstAsyncUnlockForEquippedHull(
										hullIntegrity,
										firstAsync
									),
									allowFirstHullEmergencyRun:
										ownsHullPlate === false && hullTier === 'patched'
								}).map((tail) => ({
									id: `${tail.minutes}m`,
									label: tail.label,
									minutes: tail.minutes
								}));

				if (ownsHullPlate === false && hullTier === 'patched') {
					await trackTutorialRecoveryState(db, pilotId, {
						hullTier,
						hullIntegrity,
						emergencyTailOffered: tailOptions.some((tail) => tail.minutes === 5)
					});
				}

				const asyncDurationEvent = isTutorialRun
					? null
					: await getPlaytestEventOnce(db, pilotId, 'async_duration_chosen');
				const chosenAsyncTailMinutes =
					typeof asyncDurationEvent?.payload.extractionTailMinutes === 'number'
						? asyncDurationEvent.payload.extractionTailMinutes
						: null;
				const allowedTailMinutes = tailOptions.map((tail) => tail.minutes);
				const defaultTailMinutes = isTutorialRun
					? (tailOptions[0]?.minutes ?? 60)
					: preferredExtractionTailMinutes(allowedTailMinutes, chosenAsyncTailMinutes);

				const { preview: deployPreview } = await loadDeployPreviewForPilot(db, {
					pilotId,
					trueConcentrationPercent: sample.trueConcentrationPercent,
					extractionTailMinutes: defaultTailMinutes,
					isPushRun: false,
					isTutorialRun
				});

				const rigReady = isRigDeployReady(equipped);
				const tutorialDeployAllowed =
					tutorialStep === null ||
					tutorialStep === 'done' ||
					tutorialDeployRun !== null;
				const blockedReason = deployBlockedReason({
					rigReady,
					spotRemainingUnits: spotYield.remainingUnits,
					hasOpenRun: openRun !== null,
					tailOptionCount: tailOptions.length,
					tutorialStep,
					tutorialDeployRun
				});

				const scriptedRecoveryUnits =
					tutorialDeployRun === 2
						? TUTORIAL_RUN_2_YIELD
						: tutorialDeployRun === 1
							? TUTORIAL_RUN_1_YIELD_FLOOR
							: null;

				const deployFirstAsyncWaiver = deployPreviewFirstAsyncWaiverActive(
					hullIntegrity,
					defaultTailMinutes,
					firstAsync
				);

				const tutorialTargetValid =
					!isTutorialDeployLockedStep(tutorialStep) ||
					validateTutorialDeployTarget({
						tutorialStep,
						resourceSlug: resource.resourceSlug,
						resourceInstanceId,
						spotId: hereSpotId,
						lockedTarget: lockedTutorialTarget
					}).allowed;

				deployContext = {
					spotId: hereSpotId,
					resourceInstanceId,
					displayName: resource.displayName,
					resourceSlug: resource.resourceSlug,
					trueConcentrationPercent: sample.trueConcentrationPercent,
					spotRemainingUnits: spotYield.remainingUnits,
					isTutorialRun,
					tailOptions,
					defaultTailMinutes,
					deployPreview,
					scriptedRecoveryUnits,
					hullDeployWarning: hullDeployWarningLine(hullIntegrity, {
						plannedDurationSeconds: defaultTailMinutes * 60,
						extractionTailMinutes: defaultTailMinutes,
						firstAsyncWaiverActive: deployFirstAsyncWaiver
					}),
					sameWaypointDeployHint:
						tutorialStep === 'second_deploy' ? TUTORIAL_SECOND_DEPLOY_LOCKED_LINE : null,
					tutorialDeployLocked: isTutorialDeployLockedStep(tutorialStep),
					tutorialDeployLockedBanner: isTutorialDeployLockedStep(tutorialStep)
						? TUTORIAL_DEPLOY_LOCKED_BANNER
						: null,
					tutorialDeployLockedReason: isTutorialDeployLockedStep(tutorialStep)
						? TUTORIAL_DEPLOY_LOCKED_REASON
						: null,
					lockedTutorialTarget,
					thumpTargetNote:
						resource.resourceSlug === THUMP_TARGET_RESOURCE_SLUG
							? 'Thump target — deploy for bulk haul, not hand-sampling'
							: null,
					rigReady,
					canDeploy:
						rigReady &&
						(spotYield.remainingUnits > 0 ||
							tutorialDeployWaivesSpotExhaustion(tutorialDeployRun)) &&
						!openRun &&
						tailOptions.length > 0 &&
						tutorialDeployAllowed &&
						tutorialTargetValid,
					deployBlockedReason: tutorialTargetValid
						? blockedReason
						: 'Tutorial deploy must use the locked Keth Iron waypoint.'
				};
			}
		}
	}

	const waypointSamples = await listPilotWaypointSamples(db, { pilotId, bloomId: activeBloomId });
	const waypoints = await Promise.all(
		waypointSamples.map(async (row) => {
			const bloom = await getBloomRecord(db, activeBloomId);
			const generationSeed = bloom?.generationSeed ?? `red-mesa-bloom-${activeBloomId}`;
			const yieldState = await getDepositSpotYieldState(db, {
				spotId: row.spotId,
				resourceInstanceId: row.resourceInstanceId,
				generationSeed
			});
			return {
				spotId: row.spotId,
				resourceInstanceId: row.resourceInstanceId,
				displayName: row.displayName,
				remainingUnits: yieldState.remainingUnits,
				exhausted: yieldState.remainingUnits <= 0
			};
		})
	);

	const equippedScanner = await getEquippedScannerForPilot(db, pilotId);
	const rigMonitorPrompt =
		openRun !== null || claimView?.mode === 'claimable' || claimView?.mode === 'result';

	if (rigMonitorPrompt) {
		await trackActiveRunPanelRendered(db, pilotId, {
			screen: 'field',
			openRunActive: openRun !== null,
			claimMode: claimView?.mode ?? 'none'
		});
	}

	return {
		regionId: 'red_mesa' as const,
		activeBloomId,
		activeBloomName: activeBloomDisplayName(activeBloomId),
		missionTicker,
		isTutorialSurvey: activeBloomId === BLOOM_ONE_ID && !hasCompletedTutorial,
		hasCompletedTutorial,
		selectedFamily,
		hasFamilyScan,
		resources,
		surveyEnergy: prospectingProgress.surveyEnergy,
		surveyEnergyCap: SURVEY_ENERGY_CAP,
		surveyEnergyOutlook: surveyEnergyOutlookData,
		equippedScanner: equippedScanner
			? {
					displayName: equippedScanner.displayName,
					surveyClarityScore: equippedScanner.propertyScores.survey_clarity ?? 0
				}
			: null,
		session: {
			resourceInstanceId: session.resourceInstanceId,
			positionX: session.positionX,
			positionY: session.positionY,
			gridWidth: TOPOLOGY_GRID_WIDTH,
			gridHeight: TOPOLOGY_GRID_HEIGHT
		},
		mapView,
		hereSpotId,
		waypoints: waypoints.filter(
			(waypoint) =>
				!waypoint.exhausted ||
				(tutorialStep === 'second_deploy' &&
					lockedTutorialTarget !== null &&
					waypoint.spotId === lockedTutorialTarget.depositSpotId &&
					waypoint.resourceInstanceId === lockedTutorialTarget.resourceInstanceId)
		),
		deployContext,
		pendingSampleProgress,
		handSamplesLeft,
		lastSampleResult,
		sampleFlash,
		rigMonitorPrompt,
		shouldPoll,
		fieldModeLine:
			deployContext !== null || milestoneKey === 'next_need' ? FIELD_MODE_LINE : null,
		loadedAt: now.toISOString()
	};
}
