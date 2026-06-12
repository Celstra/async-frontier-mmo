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
	getEquippedThumperPartsForPilot,
	countFieldRepairKitsForPilot,
	getOpenThumperRunForPilot,
	getThumperEventWindowsForRun,
	getPilotDepositSample,
	getPilotProspectingProgress,
	getResourceInstanceById,
	getPilotTutorialStep,
	getPlaytestEventOnce,
	hasPilotClaimedTutorialRun,
	hasPilotFamilyScan,
	listPilotWaypointSamples,
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
	hullTierFromIntegrity,
	spotIdFor,
	SURVEY_ENERGY_CAP,
	surveyEnergyOutlook,
	TOPOLOGY_GRID_HEIGHT,
	TOPOLOGY_GRID_WIDTH,
	TUTORIAL_EXTRACTION_TAIL_OPTION,
	TUTORIAL_EXTRACTION_TAIL_OPTION_5M,
	TUTORIAL_RUN_1_SEED,
	tutorialDeployForStep,
	tutorialRunFromSeed,
	isTutorialRunSeed,
	type NamedResourceId,
	type ResourceFamily
} from '@async-frontier-mmo/domain';
import { activeBloomDisplayName } from '$lib/bloomDisplay';
import {
	recommendedResourceSlugForBloom,
	resourceTeachingNote
} from '$lib/field/constants';
import { loadDeployPreviewForPilot } from '$lib/server/fieldDeployLoad.js';
import { loadClaimScreen } from '$lib/server/fieldClaimState.js';
import { loadOpenRunState } from '$lib/server/fieldRunState.js';
import { trackFieldStatReveal } from '$lib/server/playtestTelemetry.js';
import { maybeAdvanceHuntingToTurnIn } from '$lib/server/tutorialOrchestration.js';
import { resolveTargetDisplayName } from '$lib/server/targetResource.js';
import { loadSettlementMissionTicker } from '$lib/server/settlementLoad.js';
import type { getGameDb } from './gameDb.js';
import {
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
}): string | null {
	if (!input.rigReady) {
		return 'Assemble your rig in WORKSHOP before deploying';
	}
	if (input.hasOpenRun) {
		return 'You already have an open thumper run';
	}
	if (input.spotRemainingUnits <= 0) {
		return 'This deposit is exhausted';
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
	const sampleOutcome = await completePendingSampleIfDue(db, pilotId, now);
	let session = await ensurePilotFieldSession(db, pilotId, now);
	let lastSampleResult: FieldLastSampleResult | null = null;
	let sampleFlash: string | null = null;

	if (sampleOutcome?.status === 'insufficient_energy') {
		sampleFlash = 'Not enough survey energy to sample here';
	} else if (sampleOutcome?.status === 'ok' && pendingResourceId) {
		const resource = await getResourceInstanceById(db, pendingResourceId);
		if (resource) {
			await maybeAdvanceHuntingToTurnIn(db, pilotId);

			if (sampleOutcome.statsRevealedThisSample) {
				await trackFieldStatReveal(db, pilotId, resource.resourceSlug);
			}

			const showStats =
				sampleOutcome.statsRevealedThisSample ||
				(await hasPilotResourceStatReveal(db, {
					pilotId,
					resourceInstanceId: pendingResourceId
				}));

			lastSampleResult = {
				resourceDisplayName: resource.displayName,
				trickleQuantity: sampleOutcome.trickleQuantity,
				trueConcentrationPercent: sampleOutcome.trueConcentrationPercent,
				energyCost: sampleOutcome.energyCost,
				surveyEnergyAfter: sampleOutcome.surveyEnergy,
				surveyEnergyCap: SURVEY_ENERGY_CAP,
				statsRevealedThisSample: sampleOutcome.statsRevealedThisSample,
				yieldBandLabel: sampleOutcome.yieldBandLabel,
				stats: showStats ? fieldStatsFromInstance(resource) : null
			};
		}
	}
	const [activeBloomId, missionTicker] = await Promise.all([
		getActiveBloomId(db),
		loadSettlementMissionTicker(db, pilotId)
	]);
	const tutorialStep = await getPilotTutorialStep(db, pilotId);
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
	let rigView: Awaited<ReturnType<typeof loadOpenRunState>> | null = null;
	let claimView: Awaited<ReturnType<typeof loadClaimScreen>> | null = null;
	let shouldPoll = false;
	let hasUnresolvedEventWindows = false;

	if (openRun) {
		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);
		const isTutorialRun = isTutorialRunSeed(openRun.runSeed);
		rigView = await loadOpenRunState(db, openRun, fieldRepairKitCount, {
			resolveDisplayName: resolveTargetDisplayName,
			includeRunMeters: true,
			isTutorialRun
		});

		const eventWindows = await getThumperEventWindowsForRun(db, openRun.id);
		hasUnresolvedEventWindows = eventWindows.some((window) => window.chosenResponse === null);
		const runClaimable = isThumperRunClaimable({
			run: openRun,
			windows: eventWindows,
			now,
			firstAsyncWaiverActive: firstAsyncWaiverActiveForRun({
				hullIntegrity: openRun.runHullIntegrity ?? 100,
				extractionTailMinutes: openRun.extractionTailMinutes,
				thumperRunId: openRun.id,
				firstAsync
			})
		});

		shouldPoll =
			openRun.durationSeconds <= WATCHED_RUN_MAX_SECONDS ||
			isTutorialRun ||
			!runClaimable;

		if (runClaimable) {
			claimView = await loadClaimScreen(db, pilotId, now);
		}
	} else {
		claimView = await loadClaimScreen(db, pilotId, now);
		if (claimView.mode === 'none') {
			claimView = null;
		}
	}

	const selectedFamily = (session.selectedFamily ?? 'conductive_metal') as ResourceFamily;
	const hasFamilyScan = await hasPilotFamilyScan(db, {
		pilotId,
		bloomId: activeBloomId,
		family: selectedFamily
	});
	const recommendedResourceSlug = recommendedResourceSlugForBloom(
		activeBloomId,
		hasCompletedTutorial
	);

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
			teachingNote: resourceTeachingNote(resource.resourceSlug),
			recommended: resource.resourceSlug === recommendedResourceSlug
		})) ?? [];

	let mapView = null;
	let deployContext = null;
	let hereSpotId: string | null = null;
	let pendingSampleProgress: {
		completesAt: string;
		progressPercent: number;
	} | null = null;

	if (session.pendingSample) {
		const elapsed = now.getTime() - session.pendingSample.startedAt.getTime();
		const total =
			session.pendingSample.completesAt.getTime() - session.pendingSample.startedAt.getTime();
		pendingSampleProgress = {
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
									)
								}).map((tail) => ({
									id: `${tail.minutes}m`,
									label: tail.label,
									minutes: tail.minutes
								}));

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
				const blockedReason = deployBlockedReason({
					rigReady,
					spotRemainingUnits: spotYield.remainingUnits,
					hasOpenRun: openRun !== null
				});

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
					rigReady,
					canDeploy: rigReady && spotYield.remainingUnits > 0 && !openRun,
					deployBlockedReason: blockedReason
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
	const showRigView =
		openRun !== null &&
		(openRun.durationSeconds <= WATCHED_RUN_MAX_SECONDS ||
			isTutorialRunSeed(openRun.runSeed) ||
			hasUnresolvedEventWindows);

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
		waypoints: waypoints.filter((waypoint) => !waypoint.exhausted),
		deployContext,
		pendingSampleProgress,
		lastSampleResult,
		sampleFlash,
		showRigView,
		rigView,
		claimView,
		shouldPoll,
		loadedAt: now.toISOString()
	};
}
