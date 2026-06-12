import {
	DepositSpotExhaustedError,
	DepositSpotStaleError,
	deployThumperRunWithEventWindows,
	getAnyTutorialRunDeployTarget,
	getClaimedTutorialRunDeployTarget,
	listPilotWaypointSamples,
	getBloomRecord,
	getDepositSpotYieldState,
	getOpenThumperRunForPilot,
	getPilotDepositSample,
	getEquippedThumperPartsForPilot,
	getResourceInstanceById,
	movePilotOnField,
	recordThumperEventWindowResponseForPilot,
	countFieldRepairKitsForPilot,
	getThumperEventWindowsForRun,
	ensurePilotFieldSession,
	getActiveBloomId,
	countPlaytestEventsByName,
	scanFamilyForPilot,
	acknowledgeThumperRunResult,
	scanPilotFieldTile,
	samplesTakenOnSpot,
	setPilotFieldFamily,
	setPilotFieldPosition,
	setPilotFieldResource,
	startPilotFieldSample
} from '@async-frontier-mmo/db';
import {
	generateThumperEventWindows,
	TOPOLOGY_GRID_HEIGHT,
	TOPOLOGY_GRID_WIDTH,
	TUTORIAL_EXTRACTION_TAIL_OPTION,
	TUTORIAL_EXTRACTION_TAIL_OPTION_5M,
	FIRST_ASYNC_TAIL_MINUTES,
	TUTORIAL_RUN_1_MINUTES,
	TUTORIAL_RUN_1_SEED,
	SPOT_SAMPLE_POOL,
	spotIdFor,
	TUTORIAL_RUN_2_MINUTES,
	tutorialDeployForStep,
	tutorialRunFromSeed,
	tutorialRunSeed,
	type NamedResourceId,
	type ResourceFamily,
	type ThumperComplicationId,
	type ThumperEventActionId
} from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';
import { FIELD_FAMILY_OPTIONS, parseFieldFamily } from '$lib/field/constants';
import {
	allowedExtractionTailsForEquippedHull,
	loadDeployPreviewForPilot
} from '$lib/server/fieldDeployLoad';
import {
	firstAsyncUnlockForEquippedHull,
	loadFirstAsyncTailState,
	recordFirstAsyncDeployUsed
} from '$lib/server/firstAsyncTailState';
import { loadFieldScreen } from '$lib/server/fieldLoad';
import { claimOpenRun } from '$lib/server/fieldWorkflow';
import {
	isRunEndedByRecall,
	loadOpenRunState,
	parseChosenResponse,
	parseWindowIndex,
	validateEventWindowRespondOrder,
	validateEventWindowResponse
} from '$lib/server/fieldRunState';
import { getGameDb } from '$lib/server/gameDb';
import { requirePlayablePilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import {
	trackFieldDeploy,
	trackFieldFamilyChosen,
	trackSecondFamilyStarted,
	trackFieldFirstClaim,
	trackFieldMove,
	trackFieldSampleCommit,
	trackFieldStatReveal,
	trackFieldTileScan,
	trackSliceEventWindowResolved
} from '$lib/server/playtestTelemetry';
import {
	advanceTutorialStepIf,
	maybeAdvanceHuntingToTurnIn,
	readTutorialStep
} from '$lib/server/tutorialOrchestration';
import { resolveTargetDisplayName } from '$lib/server/targetResource';
import { recommendedResourceSlugForBloom } from '$lib/field/constants';
import type { Actions, PageServerLoad } from './$types';

async function fieldData(db: ReturnType<typeof getGameDb>, pilotId: string) {
	return loadFieldScreen(db, pilotId, new Date());
}

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const gate = await requirePlayablePilot(db, pilotId);
	if (gate) {
		redirect(303, '/');
	}

	return fieldData(db, pilotId);
};

export const actions: Actions = {
	selectFamily: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const formData = await event.request.formData();
		const family = parseFieldFamily(formData.get('family')?.toString() ?? null);

		if (!FIELD_FAMILY_OPTIONS.some((option) => option.id === family)) {
			return fail(400, { message: 'Unknown resource family', ...(await fieldData(db, pilotId)) });
		}

		await setPilotFieldFamily(db, { pilotId, family });

		const alreadyChoseFamily =
			(await countPlaytestEventsByName(db, pilotId, 'first_family_chosen')) > 0;

		if (!alreadyChoseFamily) {
			await trackFieldFamilyChosen(db, pilotId, family);
			await advanceTutorialStepIf(db, pilotId, 'first_orders', 'hunting');
		} else {
			await trackSecondFamilyStarted(db, pilotId, family);
		}

		return fieldData(db, pilotId);
	},

	scanFamily: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const formData = await event.request.formData();
		const family = parseFieldFamily(formData.get('family')?.toString() ?? null);

		const outcome = await scanFamilyForPilot(db, { pilotId, family: family as ResourceFamily });
		if (outcome.status === 'insufficient_energy') {
			return fail(400, {
				message: 'Not enough survey energy for a family scan',
				...(await fieldData(db, pilotId))
			});
		}

		return fieldData(db, pilotId);
	},

	selectResource: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const formData = await event.request.formData();
		const resourceInstanceId = formData.get('resourceInstanceId');

		if (typeof resourceInstanceId !== 'string') {
			return fail(400, { message: 'Pick a resource signal', ...(await fieldData(db, pilotId)) });
		}

		const resource = await getResourceInstanceById(db, resourceInstanceId);
		if (!resource) {
			return fail(400, { message: 'Resource not found', ...(await fieldData(db, pilotId)) });
		}

		await setPilotFieldResource(db, { pilotId, resourceInstanceId });
		return fieldData(db, pilotId);
	},

	scan: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const session = await ensurePilotFieldSession(db, pilotId);

		if (!session.resourceInstanceId) {
			return fail(400, { message: 'Activate a resource map first', ...(await fieldData(db, pilotId)) });
		}

		await scanPilotFieldTile(db, {
			pilotId,
			x: session.positionX,
			y: session.positionY
		});
		await trackFieldTileScan(db, pilotId);

		return fieldData(db, pilotId);
	},

	move: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const formData = await event.request.formData();
		const direction = formData.get('direction')?.toString();

		const deltas: Record<string, { dx: number; dy: number }> = {
			north: { dx: 0, dy: -1 },
			south: { dx: 0, dy: 1 },
			west: { dx: -1, dy: 0 },
			east: { dx: 1, dy: 0 }
		};
		const delta = direction ? deltas[direction] : undefined;
		if (!delta) {
			return fail(400, { message: 'Invalid move', ...(await fieldData(db, pilotId)) });
		}

		const outcome = await movePilotOnField(db, {
			pilotId,
			...delta,
			gridWidth: TOPOLOGY_GRID_WIDTH,
			gridHeight: TOPOLOGY_GRID_HEIGHT
		});

		if ('error' in outcome) {
			if (outcome.error === 'out_of_bounds') {
				return {
					...(await fieldData(db, pilotId)),
					mapFlash: 'Cannot move off the map',
					mapFlashKey: Date.now()
				};
			}
			const messages = {
				pending_sample: 'Sampling in progress — hold position'
			};
			return fail(400, { message: messages[outcome.error], ...(await fieldData(db, pilotId)) });
		}

		await trackFieldMove(db, pilotId);
		return fieldData(db, pilotId);
	},

	sample: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const now = new Date();
		const session = await ensurePilotFieldSession(db, pilotId);

		if (!session.resourceInstanceId) {
			return fail(400, { message: 'Activate a resource map first', ...(await fieldData(db, pilotId)) });
		}

		const spotId = spotIdFor(
			session.resourceInstanceId,
			session.positionX,
			session.positionY
		);
		const samplesTaken = await samplesTakenOnSpot(db, { pilotId, spotId });
		if (samplesTaken >= SPOT_SAMPLE_POOL) {
			return {
				...(await fieldData(db, pilotId)),
				sampleFlash:
					'Surface remnants exhausted here — nothing left to hand-sample. Deploy a thumper to tap the deposit.'
			};
		}

		const outcome = await startPilotFieldSample(db, {
			pilotId,
			resourceInstanceId: session.resourceInstanceId,
			x: session.positionX,
			y: session.positionY
		});

		if ('error' in outcome) {
			return fail(400, {
				message: 'Already sampling this tile',
				...(await fieldData(db, pilotId))
			});
		}

		await trackFieldSampleCommit(db, pilotId);
		return fieldData(db, pilotId);
	},

	deploy: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const open = await getOpenThumperRunForPilot(db, pilotId);
		if (open) {
			return fail(400, { message: 'You already have an open thumper run', ...(await fieldData(db, pilotId)) });
		}

		const formData = await event.request.formData();
		const resourceInstanceId = formData.get('resourceInstanceId');
		const spotId = formData.get('spotId');
		const tailMinutesRaw = formData.get('tailMinutes');

		if (typeof resourceInstanceId !== 'string' || typeof spotId !== 'string') {
			return fail(400, { message: 'Invalid deploy target', ...(await fieldData(db, pilotId)) });
		}

		const sample = await getPilotDepositSample(db, { pilotId, resourceInstanceId, spotId });
		if (!sample) {
			return fail(400, {
				message: 'Sample this deposit before deploying',
				...(await fieldData(db, pilotId))
			});
		}

		const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
		if (!equipped.drill || !equipped.pump || !equipped.hull) {
			return fail(400, {
				message: 'Assemble your rig in WORKSHOP before deploying',
				...(await fieldData(db, pilotId))
			});
		}

		const resource = await getResourceInstanceById(db, resourceInstanceId);
		if (!resource) {
			return fail(400, { message: 'Resource not found', ...(await fieldData(db, pilotId)) });
		}

		const tutorialStep = await readTutorialStep(db, pilotId);
		const tutorialRun = tutorialDeployForStep(tutorialStep);
		if (tutorialStep && tutorialStep !== 'done' && tutorialRun === null) {
			return fail(400, {
				message: 'Foreman has another job for you before the next deploy',
				...(await fieldData(db, pilotId))
			});
		}
		const isTutorialRun = tutorialRun !== null;

		if (tutorialRun === 2) {
			// (a) Prefer a claimed run-1 row; (b) fall back to any run-1 row (expired unclaimed);
			// (c) fall back to the highest-concentration sampled spot this pilot has.
			let firstRunWaypoint = await getClaimedTutorialRunDeployTarget(db, {
				pilotId,
				runSeed: TUTORIAL_RUN_1_SEED
			});

			if (!firstRunWaypoint?.depositSpotId || !firstRunWaypoint.resourceInstanceId) {
				firstRunWaypoint = await getAnyTutorialRunDeployTarget(db, {
					pilotId,
					runSeed: TUTORIAL_RUN_1_SEED
				});
			}

			if (!firstRunWaypoint?.depositSpotId || !firstRunWaypoint.resourceInstanceId) {
				// (c) Any sampled spot — pick the highest concentration.
				const activeBloomId = await getActiveBloomId(db);
				const waypointSamples = await listPilotWaypointSamples(db, { pilotId, bloomId: activeBloomId });
				const best = waypointSamples.sort(
					(a, b) => (b.trueConcentrationPercent ?? 0) - (a.trueConcentrationPercent ?? 0)
				)[0];
				if (best) {
					firstRunWaypoint = {
						depositSpotId: best.spotId,
						resourceInstanceId: best.resourceInstanceId
					};
				}
			}

			if (!firstRunWaypoint?.depositSpotId || !firstRunWaypoint.resourceInstanceId) {
				return fail(400, {
					message: 'Complete your first tutorial deploy before redeploying',
					...(await fieldData(db, pilotId))
				});
			}
			if (
				resourceInstanceId !== firstRunWaypoint.resourceInstanceId ||
				spotId !== firstRunWaypoint.depositSpotId
			) {
				return fail(400, {
					message: 'Second tutorial deploy must use the same waypoint as your first run',
					...(await fieldData(db, pilotId))
				});
			}
		}

		const extractionTailMinutes = isTutorialRun
			? tutorialRun === 1
				? TUTORIAL_RUN_1_MINUTES
				: TUTORIAL_RUN_2_MINUTES
			: Number.parseInt(String(tailMinutesRaw ?? '60'), 10);

		if (!Number.isFinite(extractionTailMinutes) || extractionTailMinutes <= 0) {
			return fail(400, { message: 'Pick a run duration', ...(await fieldData(db, pilotId)) });
		}

		const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });

		if (!isTutorialRun) {
			const allowedTails = allowedExtractionTailsForEquippedHull(equipped, firstAsync);
			if (!allowedTails.includes(extractionTailMinutes)) {
				return fail(400, {
					message: 'That run duration exceeds your hull ceiling',
					...(await fieldData(db, pilotId))
				});
			}
		}

		const bloom = await getBloomRecord(db, resource.bloomId);
		const bloomGenerationSeed = bloom?.generationSeed ?? `red-mesa-bloom-${resource.bloomId}`;
		const spotYield = await getDepositSpotYieldState(db, {
			spotId,
			resourceInstanceId,
			generationSeed: bloomGenerationSeed
		});

		if (spotYield.remainingUnits <= 0) {
			return fail(400, {
				message: 'This deposit is exhausted — find another waypoint',
				...(await fieldData(db, pilotId))
			});
		}

		const { preview } = await loadDeployPreviewForPilot(db, {
			pilotId,
			trueConcentrationPercent: sample.trueConcentrationPercent,
			extractionTailMinutes,
			isPushRun: false,
			isTutorialRun
		});

		const runSeed = isTutorialRun ? tutorialRunSeed(tutorialRun) : crypto.randomUUID();
		const plan = generateThumperEventWindows({
			targetResourceId: resource.resourceSlug as NamedResourceId,
			runSeed,
			isPushRun: false,
			tutorialRun: tutorialRun ?? undefined,
			extractionTailMinutes
		});

		let deployedRun: Awaited<ReturnType<typeof deployThumperRunWithEventWindows>>;
		try {
			deployedRun = await deployThumperRunWithEventWindows(db, {
				pilotId,
				targetResourceId: resource.resourceSlug,
				runSeed: plan.runSeed,
				isPushRun: plan.isPushRun,
				deployedAt: new Date(),
				durationSeconds: preview.totalDurationSeconds,
				depositSpotId: spotId,
				trueConcentrationPercent: sample.trueConcentrationPercent,
				extractionTailMinutes,
				resourceInstanceId,
				windows: plan.windows
					.filter((window) => !window.quiet)
					.map((window) => ({
						windowIndex: window.windowIndex,
						complication: window.complication,
						matchingAction: window.matchingAction
					}))
			});
		} catch (error) {
			if (error instanceof DepositSpotExhaustedError) {
				return fail(400, {
					message: 'This deposit is exhausted',
					...(await fieldData(db, pilotId))
				});
			}
			if (error instanceof DepositSpotStaleError) {
				return fail(400, {
					message: 'That deposit signal has faded',
					...(await fieldData(db, pilotId))
				});
			}
			throw error;
		}

		if (
			!isTutorialRun &&
			firstAsync.waiverPending &&
			extractionTailMinutes === FIRST_ASYNC_TAIL_MINUTES &&
			firstAsyncUnlockForEquippedHull(equipped.hull?.integrity ?? 100, firstAsync)
		) {
			await recordFirstAsyncDeployUsed(db, pilotId, deployedRun.id);
		}

		await trackFieldDeploy(db, pilotId, {
			targetResourceId: resource.resourceSlug,
			tutorialRun,
			extractionTailMinutes
		});

		return fieldData(db, pilotId);
	},

	goToWaypoint: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const formData = await event.request.formData();
		const resourceInstanceId = formData.get('resourceInstanceId');
		const spotId = formData.get('spotId');

		if (typeof resourceInstanceId !== 'string' || typeof spotId !== 'string') {
			return fail(400, { message: 'Invalid waypoint', ...(await fieldData(db, pilotId)) });
		}

		const coords = spotId.match(/@(\d+),(\d+)$/);
		if (!coords) {
			return fail(400, { message: 'Unknown waypoint format', ...(await fieldData(db, pilotId)) });
		}

		await setPilotFieldResource(db, { pilotId, resourceInstanceId });
		await setPilotFieldPosition(db, {
			pilotId,
			x: Number.parseInt(coords[1]!, 10),
			y: Number.parseInt(coords[2]!, 10)
		});

		return fieldData(db, pilotId);
	},

	respondEventWindow: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const run = await getOpenThumperRunForPilot(db, pilotId);
		if (!run) {
			return fail(400, { message: 'No open thumper run', ...(await fieldData(db, pilotId)) });
		}

		const formData = await event.request.formData();
		const windowIndex = parseWindowIndex(formData.get('windowIndex'));
		const chosenResponse = parseChosenResponse(formData.get('chosenResponse'));

		if (windowIndex === null || chosenResponse === null) {
			return fail(400, { message: 'Invalid event window response', ...(await fieldData(db, pilotId)) });
		}

		const windows = await getThumperEventWindowsForRun(db, run.id);
		const window = windows.find((row) => row.windowIndex === windowIndex);
		if (!window) {
			return fail(400, { message: 'Event window not found', ...(await fieldData(db, pilotId)) });
		}

		if (isRunEndedByRecall(windows)) {
			return fail(400, { message: 'Run already ended with Recall Early', ...(await fieldData(db, pilotId)) });
		}

		const orderValidation = validateEventWindowRespondOrder({
			windows,
			windowIndex,
			chosenResponse
		});
		if (!orderValidation.ok) {
			return fail(400, { message: orderValidation.reason, ...(await fieldData(db, pilotId)) });
		}

		const fieldRepairKitCount = await countFieldRepairKitsForPilot(db, pilotId);
		const validation = validateEventWindowResponse({
			complication: window.complication as ThumperComplicationId,
			matchingAction: window.matchingAction as ThumperEventActionId,
			chosenResponse,
			fieldRepairKitCount
		});
		if (!validation.ok) {
			return fail(400, { message: validation.reason, ...(await fieldData(db, pilotId)) });
		}

		if (window.chosenResponse === null) {
			const preRespondState = await loadOpenRunState(db, run, fieldRepairKitCount, {
				resolveDisplayName: resolveTargetDisplayName,
				includeRunMeters: true,
				isTutorialRun: tutorialRunFromSeed(run.runSeed) !== null
			});
			if (!preRespondState.runMeters) {
				return fail(500, { message: 'Run meters unavailable', ...(await fieldData(db, pilotId)) });
			}

			const outcome = await recordThumperEventWindowResponseForPilot(db, {
				pilotId,
				thumperRunId: run.id,
				windowIndex,
				complication: window.complication,
				matchingAction: window.matchingAction,
				severity: window.severity ?? 'minor',
				chosenResponse,
				currentMeters: preRespondState.runMeters,
				totalWindowCount: windows.length,
				runHullCondition: run.runHullCondition,
				runHullIntegrity: run.runHullIntegrity
			});
			if (outcome.status === 'no_repair_kit') {
				return fail(400, {
					message: 'Field Repair requires a crafted Field Repair Kit',
					...(await fieldData(db, pilotId))
				});
			}
			if (outcome.status === 'not_recorded') {
				return fail(400, {
					message: 'Could not record event window response',
					...(await fieldData(db, pilotId))
				});
			}

			await trackSliceEventWindowResolved(db, pilotId, {
				windowIndex,
				chosenResponse,
				complication: window.complication
			});
		}

		return fieldData(db, pilotId);
	},

	claim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const now = new Date();
		const tutorialStepBeforeClaim = await readTutorialStep(db, pilotId);

		let outcome;
		try {
			outcome = await claimOpenRun(db, pilotId, now);
		} catch (error) {
			return fail(500, {
				message: error instanceof Error ? error.message : 'Claim failed unexpectedly',
				...(await fieldData(db, pilotId))
			});
		}

		if (outcome.status === 'claimed' || outcome.status === 'already_claimed') {
			if (outcome.status === 'claimed' && outcome.claimResult) {
				if (tutorialStepBeforeClaim === 'first_deploy') {
					await trackFieldFirstClaim(db, pilotId, {
						recoveredQuantity: outcome.claimResult.recoveredQuantity
					});
					await advanceTutorialStepIf(db, pilotId, 'first_deploy', 'recall_lesson');
				} else if (tutorialStepBeforeClaim === 'second_deploy') {
					await advanceTutorialStepIf(db, pilotId, 'second_deploy', 'full_claim');
				}
			}
			return fieldData(db, pilotId);
		}

		if (outcome.status === 'not_claimable') {
			return fail(400, { message: 'Thumper is not claimable yet', ...(await fieldData(db, pilotId)) });
		}

		return fail(400, {
			message: outcome.status === 'not_resolvable' ? outcome.message : 'No thumper to claim',
			...(await fieldData(db, pilotId))
		});
	},

	acknowledgeClaim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		const formData = await event.request.formData();
		const thumperRunId = formData.get('thumperRunId');

		if (typeof thumperRunId !== 'string') {
			return fail(400, { message: 'Missing thumper run', ...(await fieldData(db, pilotId)) });
		}

		const outcome = await acknowledgeThumperRunResult(db, {
			pilotId,
			thumperRunId
		});

		if (outcome.status === 'not_found') {
			return fail(400, { message: 'Claim result not found', ...(await fieldData(db, pilotId)) });
		}

		return fieldData(db, pilotId);
	}
};
