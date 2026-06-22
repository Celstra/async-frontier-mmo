import {
	REINFORCED_HULL_PLATE,
	assertAllowedCommandQueueDeployLength,
	commandQueueLengthForThumperFrameTier,
	defenseRunDurationSeconds,
	FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
	generateDepositSpots,
	isMediumCommandQueueDeployAllowed,
	LargeCommandQueueDeployBlockedError,
	MediumCommandQueueDeployNotAllowedError,
	thumperFrameTierFromHullSchematic,
	type ThumperFrameTier
} from '@async-frontier-mmo/domain';
import type { Db, DbExecutor } from '../client.js';
import { items } from '../schema/items.js';
import { pilotDepositSpotSamples } from '../schema/pilotDepositSpotSamples.js';
import { BLOOM_ONE_ID } from '../seed/bloomOneSeed.js';
import { getBloomRecord } from './bloomRotation.js';
import { seedDepositSpotRemainingUnits } from './depositSpotYields.js';
import {
	ensureBloomOneResourceInstances,
	getResourceInstanceByBloomSlug
} from './resourceInstances.js';
import {
	ensurePilotProjectTarget,
	getPilotProjectTarget,
	type PilotProjectTarget
} from './projectTargets.js';
import {
	equipThumperPartForPilot,
	ensureStarterThumperPartsForPilot,
	getEquippedThumperPartsForPilot
} from './thumperPartEquipment.js';
import { ensureSessionPilot } from './pilots.js';
import {
	deployThumperRunWithEventWindows,
	PROJECT_LED_COMMAND_QUEUE_RUN_MODE
} from './thumperRunWorkflow.js';

export {
	LargeCommandQueueDeployBlockedError,
	MediumCommandQueueDeployNotAllowedError
} from '@async-frontier-mmo/domain';

export type ProjectLedCommandQueueDeployInput = {
	pilotId: string;
	targetResourceId: string;
	resourceInstanceId: string;
	depositSpotId: string;
	trueConcentrationPercent: number;
	runSeed: string;
	deployedAt?: Date;
	extractionTailMinutes?: number;
	/** When set, must match equipped hull schematic tier. */
	thumperFrameTier?: ThumperFrameTier;
};

export type ProjectLedFieldDeployRig = {
	resourceInstanceId: string;
	targetResourceId: string;
	depositSpotId: string;
	trueConcentrationPercent: number;
	bloomGenerationSeed: string;
};

export async function resolveThumperFrameTierForPilot(
	db: DbExecutor,
	pilotId: string
): Promise<ThumperFrameTier> {
	const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
	return thumperFrameTierFromHullSchematic(equipped.hull?.schematicId);
}

function projectNeedUnitsForTarget(target: PilotProjectTarget): number {
	const schematic =
		target.schematicId === REINFORCED_HULL_PLATE.id ? REINFORCED_HULL_PLATE : null;
	const slot = schematic?.slots.find((entry) => entry.id === target.targetSlotId);
	return slot?.inputQuantity ?? 0;
}

export async function buildProjectLedCommandQueueRunContext(
	db: DbExecutor,
	pilotId: string
): Promise<{
	runMode: typeof PROJECT_LED_COMMAND_QUEUE_RUN_MODE;
	schematicId: string;
	targetSlotId: string;
	targetFamily: string;
	projectNeedUnits: number;
}> {
	const target = await ensurePilotProjectTarget(db, pilotId);
	return {
		runMode: PROJECT_LED_COMMAND_QUEUE_RUN_MODE,
		schematicId: target.schematicId,
		targetSlotId: target.targetSlotId,
		targetFamily: target.targetFamily,
		projectNeedUnits: projectNeedUnitsForTarget(target)
	};
}

/** Real server deploy path for project-led command-queue thumper runs. */
export async function deployProjectLedCommandQueueRun(
	db: Db,
	input: ProjectLedCommandQueueDeployInput
) {
	const equipped = await getEquippedThumperPartsForPilot(db, input.pilotId);
	const equippedTier = thumperFrameTierFromHullSchematic(equipped.hull?.schematicId);
	const tier = input.thumperFrameTier ?? equippedTier;

	if (
		tier === 'medium' &&
		!isMediumCommandQueueDeployAllowed({ hullSchematicId: equipped.hull?.schematicId })
	) {
		throw new MediumCommandQueueDeployNotAllowedError();
	}

	if (input.thumperFrameTier && input.thumperFrameTier !== equippedTier) {
		throw new Error(
			`Requested thumper frame tier ${input.thumperFrameTier} does not match equipped hull (${equippedTier})`
		);
	}

	const commandQueueLength = assertAllowedCommandQueueDeployLength(
		commandQueueLengthForThumperFrameTier(tier)
	);
	const projectRunContext = await buildProjectLedCommandQueueRunContext(db, input.pilotId);
	const deployedAt = input.deployedAt ?? new Date();

	return deployThumperRunWithEventWindows(db, {
		pilotId: input.pilotId,
		targetResourceId: input.targetResourceId,
		runSeed: input.runSeed,
		isPushRun: false,
		deployedAt,
		durationSeconds: defenseRunDurationSeconds(),
		depositSpotId: input.depositSpotId,
		trueConcentrationPercent: input.trueConcentrationPercent,
		extractionTailMinutes: input.extractionTailMinutes ?? 60,
		resourceInstanceId: input.resourceInstanceId,
		windows: [],
		requirePilotSample: true,
		projectRunContext,
		commandQueueLength
	});
}

export async function grantAndEquipReinforcedHullPlateForPilot(db: Db, pilotId: string) {
	await ensureSessionPilot(db, pilotId);
	const parts = await ensureStarterThumperPartsForPilot(db, pilotId, { autoEquip: true });
	if (parts.granted) {
		// Starter grant already equipped worn hull — replace below.
	}

	const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
	for (const slot of ['drill', 'pump'] as const) {
		const part = equipped[slot];
		if (!part) {
			throw new Error(`Pilot ${pilotId} is missing equipped ${slot} for medium deploy rig`);
		}
	}

	const [hullItem] = await db
		.insert(items)
		.values({
			pilotId,
			schematicId: REINFORCED_HULL_PLATE.id,
			schematicVersion: REINFORCED_HULL_PLATE.version,
			displayName: REINFORCED_HULL_PLATE.displayName,
			propertyScores: {
				max_condition: 55,
				damage_reduction: 50,
				repairability: 45
			},
			provenance: [],
			condition: 72,
			integrity: 68
		})
		.returning();

	await equipThumperPartForPilot(db, {
		pilotId,
		slot: 'hull',
		itemId: hullItem!.id
	});

	return hullItem!;
}

export async function ensureProjectLedFieldDeployRig(
	db: Db,
	pilotId: string,
	options?: { mediumHull?: boolean }
): Promise<ProjectLedFieldDeployRig> {
	await ensureSessionPilot(db, pilotId);
	await ensureBloomOneResourceInstances(db);
	await ensureStarterThumperPartsForPilot(db, pilotId, { autoEquip: true });
	if (options?.mediumHull) {
		await grantAndEquipReinforcedHullPlateForPilot(db, pilotId);
	}
	await ensurePilotProjectTarget(db, pilotId);

	const keth = await getResourceInstanceByBloomSlug(db, BLOOM_ONE_ID, 'keth_iron');
	if (!keth) {
		throw new Error('Keth Iron resource instance missing for project-led deploy rig');
	}

	const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
	const bloomGenerationSeed = bloom?.generationSeed ?? `red-mesa-bloom-${BLOOM_ONE_ID}`;
	const spot = generateDepositSpots({
		resourceSlug: 'keth_iron',
		bloomGenerationSeed,
		concentrationMinPercent: keth.concentrationMinPercent,
		concentrationMaxPercent: keth.concentrationMaxPercent,
		prospectingCycle: keth.prospectingCycle
	})[0];
	if (!spot) {
		throw new Error('No deposit spots generated for Keth Iron deploy rig');
	}

	await seedDepositSpotRemainingUnits(db, {
		spotId: spot.spotId,
		resourceInstanceId: keth.id,
		generationSeed: bloomGenerationSeed,
		remainingUnits: 500
	});

	const trueConcentrationPercent = spot.trueConcentrationPercent;
	const sampledAt = new Date();

	await db
		.insert(pilotDepositSpotSamples)
		.values({
			pilotId,
			resourceInstanceId: keth.id,
			spotId: spot.spotId,
			trueConcentrationPercent,
			samplesTaken: 1,
			sampledAt
		})
		.onConflictDoUpdate({
			target: [pilotDepositSpotSamples.pilotId, pilotDepositSpotSamples.spotId],
			set: {
				trueConcentrationPercent,
				sampledAt
			}
		});

	return {
		resourceInstanceId: keth.id,
		targetResourceId: keth.resourceSlug,
		depositSpotId: spot.spotId,
		trueConcentrationPercent,
		bloomGenerationSeed
	};
}

export async function seedCommandQueuePilotViaDeploy(
	db: Db,
	pilotId: string,
	options?: { commandQueueLength?: 2 | 3 }
): Promise<void> {
	const mediumHull = options?.commandQueueLength === 3;
	const rig = await ensureProjectLedFieldDeployRig(db, pilotId, { mediumHull });

	const run = await deployProjectLedCommandQueueRun(db, {
		pilotId,
		targetResourceId: rig.targetResourceId,
		resourceInstanceId: rig.resourceInstanceId,
		depositSpotId: rig.depositSpotId,
		trueConcentrationPercent: rig.trueConcentrationPercent,
		runSeed: FIELD_COMMAND_QUEUE_SMOKE_RUN_SEED,
		thumperFrameTier: mediumHull ? 'medium' : 'small'
	});

	const expectedLength = options?.commandQueueLength ?? 2;
	if (run.commandQueueLength !== expectedLength) {
		throw new Error(
			`Deploy created command_queue_length ${run.commandQueueLength}, expected ${expectedLength}`
		);
	}

	const target = await getPilotProjectTarget(db, pilotId);
	if (!target) {
		throw new Error('Project target missing after command-queue deploy');
	}
}
