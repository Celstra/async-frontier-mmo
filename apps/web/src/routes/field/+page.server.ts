import {
	DepositSpotExhaustedError,
	DepositSpotStaleError,
	deployThumperRunWithEventWindows,
	getTutorialLockedDeployTarget,
	getBloomRecord,
	getDepositSpotYieldState,
	getOpenThumperRunForPilot,
	getPilotDepositSample,
	getEquippedThumperPartsForPilot,
	listThumperPartItemsForPilot,
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
	tutorialDeployWaivesSpotExhaustion,
	tutorialRunFromSeed,
	tutorialRunSeed,
	validateTutorialDeployTarget,
	isTutorialDeployLockedStep,
	REINFORCED_HULL_PLATE,
	type NamedResourceId,
	type ResourceFamily,
	type ThumperComplicationId,
	type ThumperEventActionId
} from '@async-frontier-mmo/domain';
import { fail, redirect } from '@sveltejs/kit';

const RIG_MONITOR_MESSAGE = 'Rig deployed — monitor events on RIG.';

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
	trackSliceEventWindowResolved,
	trackDeployAttempted
} from '$lib/server/playtestTelemetry';
import {
	advanceTutorialStepIf,
	maybeAdvanceHuntingToTurnIn,
	readTutorialStep
} from '$lib/server/tutorialOrchestration';
import { resolveTargetDisplayName } from '$lib/server/targetResource';
import type { Actions, PageServerLoad } from './$types';

async function fieldData(db: ReturnType<typeof getGameDb>, pilotId: string) {
	return loadFieldScreen(db, pilotId, new Date());
}

async function deployRejected(
	db: ReturnType<typeof getGameDb>,
	pilotId: string,
	message: string,
	telemetry: Record<string, unknown> = {}
) {
	await trackDeployAttempted(db, pilotId, { allowed: false, reason: message, ...telemetry });
	return fail(400, { message, ...(await fieldData(db, pilotId)) });
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
			return deployRejected(db, pilotId, 'You already have an open thumper run', {
				code: 'open_run'
			});
		}

		const formData = await event.request.formData();
		const resourceInstanceId = formData.get('resourceInstanceId');
		const spotId = formData.get('spotId');
		const tailMinutesRaw = formData.get('tailMinutes');

		if (typeof resourceInstanceId !== 'string' || typeof spotId !== 'string') {
			return deployRejected(db, pilotId, 'Invalid deploy target', { code: 'invalid_target' });
		}

		const sample = await getPilotDepositSample(db, { pilotId, resourceInstanceId, spotId });
		if (!sample) {
			return deployRejected(db, pilotId, 'Sample this deposit before deploying', {
				code: 'missing_sample'
			});
		}

		const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
		if (!equipped.drill || !equipped.pump || !equipped.hull) {
			return deployRejected(db, pilotId, 'Assemble your rig in WORKSHOP before deploying', {
				code: 'rig_incomplete'
			});
		}

		const thumperParts = await listThumperPartItemsForPilot(db, pilotId);
		const ownsReinforcedHullPlate = thumperParts.some(
			(part) => part.schematicId === REINFORCED_HULL_PLATE.id
		);

		const resource = await getResourceInstanceById(db, resourceInstanceId);
		if (!resource) {
			return deployRejected(db, pilotId, 'Resource not found', { code: 'resource_not_found' });
		}

		const tutorialStep = await readTutorialStep(db, pilotId);
		const tutorialRun = tutorialDeployForStep(tutorialStep);
		if (tutorialStep && tutorialStep !== 'done' && tutorialRun === null) {
			return deployRejected(db, pilotId, 'Foreman has another job for you before the next deploy', {
				code: 'tutorial_gate'
			});
		}
		const isTutorialRun = tutorialRun !== null;

		if (isTutorialDeployLockedStep(tutorialStep)) {
			const activeBloomId = await getActiveBloomId(db);
			const lockedTarget = await getTutorialLockedDeployTarget(db, {
				pilotId,
				bloomId: activeBloomId
			});
			const deployValidation = validateTutorialDeployTarget({
				tutorialStep,
				resourceSlug: resource.resourceSlug,
				resourceInstanceId,
				spotId,
				lockedTarget
			});
			if (!deployValidation.allowed) {
				return deployRejected(
					db,
					pilotId,
					deployValidation.reason ?? 'Tutorial deploy locked to Keth Iron',
					{
						code: 'tutorial_deploy_locked',
						resourceSlug: resource.resourceSlug,
						spotId
					}
				);
			}
		}

		const extractionTailMinutes = isTutorialRun
			? tutorialRun === 1
				? TUTORIAL_RUN_1_MINUTES
				: TUTORIAL_RUN_2_MINUTES
			: Number.parseInt(String(tailMinutesRaw ?? '60'), 10);

		if (!Number.isFinite(extractionTailMinutes) || extractionTailMinutes <= 0) {
			return deployRejected(db, pilotId, 'Pick a run duration', { code: 'invalid_tail' });
		}

		const firstAsync = await loadFirstAsyncTailState(db, pilotId, { tutorialStep });

		if (!isTutorialRun) {
			const allowedTails = allowedExtractionTailsForEquippedHull(
				equipped,
				firstAsync,
				ownsReinforcedHullPlate
			);
			if (!allowedTails.includes(extractionTailMinutes)) {
				return deployRejected(db, pilotId, 'That run duration exceeds your hull ceiling', {
					code: 'hull_ceiling',
					extractionTailMinutes,
					allowedTails
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

		if (spotYield.remainingUnits <= 0 && !tutorialDeployWaivesSpotExhaustion(tutorialRun)) {
			return deployRejected(db, pilotId, 'This deposit is exhausted — find another waypoint', {
				code: 'deposit_exhausted'
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
				allowExhaustedSpot: tutorialDeployWaivesSpotExhaustion(tutorialRun),
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
				return deployRejected(db, pilotId, 'This deposit is exhausted', {
					code: 'deposit_exhausted_race'
				});
			}
			if (error instanceof DepositSpotStaleError) {
				return deployRejected(db, pilotId, 'That deposit signal has faded', {
					code: 'deposit_stale'
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

		await trackDeployAttempted(db, pilotId, {
			allowed: true,
			targetResourceId: resource.resourceSlug,
			extractionTailMinutes,
			isTutorialRun,
			spotId
		});

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
		return fail(400, {
			message: RIG_MONITOR_MESSAGE,
			...(await fieldData(db, pilotId))
		});
	},

	claim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		return fail(400, {
			message: RIG_MONITOR_MESSAGE,
			...(await fieldData(db, pilotId))
		});
	},

	acknowledgeClaim: async (event) => {
		const db = getGameDb();
		const pilotId = resolvePilotId(event);
		return fail(400, {
			message: RIG_MONITOR_MESSAGE,
			...(await fieldData(db, pilotId))
		});
	}
};
