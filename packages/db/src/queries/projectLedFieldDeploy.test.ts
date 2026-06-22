import { eq, inArray } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';
import {
	analyzeSchematicReadiness,
	LARGE_COMMAND_QUEUE_SLOT_LENGTH,
	MEDIUM_COMMAND_QUEUE_SLOT_LENGTH,
	REINFORCED_HULL_PLATE,
	STARTER_COMMAND_QUEUE_SCRIPT,
	STARTER_QUEUE_LENGTH,
	starterScriptForQueueLength,
	type ThumperCommand
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilotDepositSpotSamples } from '../schema/pilotDepositSpotSamples.js';
import { pilots } from '../schema/pilots.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { thumperRunCommandLog } from '../schema/thumperRunCommandLog.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { depositSpotYields } from '../schema/depositSpotYields.js';
import { pilotProjectTargets } from '../schema/pilotProjectTargets.js';
import { appendThumperRunCommandLogEntry } from './thumperCommandQueueLog.js';
import { getOpenThumperRunForPilot } from './thumperRuns.js';
import { listResourceStacksForPilot } from './resourceGrants.js';
import {
	deployProjectLedCommandQueueRun,
	ensureProjectLedFieldDeployRig,
	grantAndEquipReinforcedHullPlateForPilot,
	LargeCommandQueueDeployBlockedError,
	MediumCommandQueueDeployNotAllowedError,
	seedCommandQueuePilotViaDeploy
} from './projectLedFieldDeploy.js';
import { claimOpenThumperRunForPilot, deployThumperRunWithEventWindows } from './thumperRunWorkflow.js';
import { resolveThumperRunForStoredWindows } from './thumperRunResolution.js';
import { ensureSessionPilot } from './pilots.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

async function deletePilotCommandQueueState(db: ReturnType<typeof createDb>, pilotId: string) {
	const pilotRuns = await db
		.select({ id: thumperRuns.id, depositSpotId: thumperRuns.depositSpotId })
		.from(thumperRuns)
		.where(eq(thumperRuns.pilotId, pilotId));
	const runIds = pilotRuns.map((run) => run.id);
	const spotIds = [...new Set(pilotRuns.map((run) => run.depositSpotId).filter(Boolean))] as string[];

	if (runIds.length > 0) {
		await db.delete(thumperRunCommandLog).where(inArray(thumperRunCommandLog.runId, runIds));
		await db.delete(thumperRunResults).where(inArray(thumperRunResults.thumperRunId, runIds));
		await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, pilotId));
	}

	for (const spotId of spotIds) {
		await db.delete(depositSpotYields).where(eq(depositSpotYields.spotId, spotId));
	}

	await db.delete(pilotDepositSpotSamples).where(eq(pilotDepositSpotSamples.pilotId, pilotId));
	await db.delete(pilotProjectTargets).where(eq(pilotProjectTargets.pilotId, pilotId));
	await db
		.update(pilots)
		.set({
			equippedScannerItemId: null,
			equippedDrillItemId: null,
			equippedPumpItemId: null,
			equippedHullItemId: null
		})
		.where(eq(pilots.id, pilotId));
	await db.delete(economyLedger).where(eq(economyLedger.pilotId, pilotId));
	await db.delete(resourceStacks).where(eq(resourceStacks.pilotId, pilotId));
	await db.delete(items).where(eq(items.pilotId, pilotId));
	await db.delete(pilots).where(eq(pilots.id, pilotId));
}

async function queueFullScript(
	db: ReturnType<typeof createDb>,
	runId: string,
	script: readonly ThumperCommand[]
) {
	const recordedAt = new Date('2026-06-22T17:00:00.000Z');
	for (const [beatIndex, command] of script.entries()) {
		await appendThumperRunCommandLogEntry(db, {
			runId,
			command,
			recordedAt: new Date(recordedAt.getTime() + beatIndex * 1_000),
			beatIndex
		});
	}
}

describeDb('project-led command queue deploy path', () => {
	const db = createDb(databaseUrl!);

	async function freshPilot(suffix: string): Promise<string> {
		const pilotId = `project-led-deploy-${suffix}-${Date.now()}`;
		await ensureSessionPilot(db, pilotId);
		return pilotId;
	}

	it('deploys starter/small rigs with command_queue_length 2', async () => {
		const pilotId = await freshPilot('small');
		try {
			const rig = await ensureProjectLedFieldDeployRig(db, pilotId);
			const run = await deployProjectLedCommandQueueRun(db, {
				pilotId,
				targetResourceId: rig.targetResourceId,
				resourceInstanceId: rig.resourceInstanceId,
				depositSpotId: rig.depositSpotId,
				trueConcentrationPercent: rig.trueConcentrationPercent,
				runSeed: 'project-led-deploy-small-seed'
			});

			expect(run.runMode).toBe('project_led_command_queue');
			expect(run.commandQueueLength).toBe(STARTER_QUEUE_LENGTH);
			expect(run.projectSchematicId).toBe(REINFORCED_HULL_PLATE.id);
			expect(run.resourceInstanceId).toBe(rig.resourceInstanceId);
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});

	it('rejects medium deploy until reinforced hull plate is equipped', async () => {
		const pilotId = await freshPilot('medium-gate');
		try {
			const rig = await ensureProjectLedFieldDeployRig(db, pilotId);
			await expect(
				deployProjectLedCommandQueueRun(db, {
					pilotId,
					targetResourceId: rig.targetResourceId,
					resourceInstanceId: rig.resourceInstanceId,
					depositSpotId: rig.depositSpotId,
					trueConcentrationPercent: rig.trueConcentrationPercent,
					runSeed: 'project-led-deploy-medium-gate-seed',
					thumperFrameTier: 'medium'
				})
			).rejects.toBeInstanceOf(MediumCommandQueueDeployNotAllowedError);
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});

	it('deploys medium rigs with command_queue_length 3 after hull payoff', async () => {
		const pilotId = await freshPilot('medium');
		try {
			await grantAndEquipReinforcedHullPlateForPilot(db, pilotId);
			const rig = await ensureProjectLedFieldDeployRig(db, pilotId);

			const run = await deployProjectLedCommandQueueRun(db, {
				pilotId,
				targetResourceId: rig.targetResourceId,
				resourceInstanceId: rig.resourceInstanceId,
				depositSpotId: rig.depositSpotId,
				trueConcentrationPercent: rig.trueConcentrationPercent,
				runSeed: 'project-led-deploy-medium-seed',
				thumperFrameTier: 'medium'
			});

			expect(run.commandQueueLength).toBe(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH);
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});

	it('blocks direct 4-slot deploy wiring', async () => {
		const pilotId = await freshPilot('large-blocked');
		try {
			const rig = await ensureProjectLedFieldDeployRig(db, pilotId);
			await expect(
				deployThumperRunWithEventWindows(db, {
					pilotId,
					targetResourceId: rig.targetResourceId,
					runSeed: 'blocked-large-queue',
					isPushRun: false,
					deployedAt: new Date('2026-06-22T17:01:00.000Z'),
					durationSeconds: 180,
					depositSpotId: rig.depositSpotId,
					trueConcentrationPercent: rig.trueConcentrationPercent,
					resourceInstanceId: rig.resourceInstanceId,
					windows: [],
					requirePilotSample: true,
					projectRunContext: {
						runMode: 'project_led_command_queue',
						schematicId: REINFORCED_HULL_PLATE.id,
						targetSlotId: 'outer_plate',
						targetFamily: 'structural_alloy',
						projectNeedUnits: 60
					},
					commandQueueLength: LARGE_COMMAND_QUEUE_SLOT_LENGTH
				})
			).rejects.toBeInstanceOf(LargeCommandQueueDeployBlockedError);
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});

	it('plays a real medium deploy through claim and feeds workshop readiness', async () => {
		const pilotId = await freshPilot('medium-claim');
		try {
			await seedCommandQueuePilotViaDeploy(db, pilotId, { commandQueueLength: 3 });

			const openRun = await getOpenThumperRunForPilot(db, pilotId);
			expect(openRun?.commandQueueLength).toBe(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH);

			const mediumScript = starterScriptForQueueLength(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH);
			await queueFullScript(db, openRun!.id, mediumScript);

			const claim = await claimOpenThumperRunForPilot(db, {
				pilotId,
				now: new Date('2026-06-22T17:05:00.000Z'),
				isClaimable: () => true,
				isResolvableRun: () => true,
				validateWindows: () => undefined,
				buildResult: (tx, runRow, windows, claimNow) =>
					resolveThumperRunForStoredWindows(tx, runRow, windows, { now: claimNow }),
				grantResourceReward: true
			});

			expect(claim.status).toBe('claimed');
			if (claim.status !== 'claimed') {
				throw new Error('expected claimed medium deploy run');
			}
			expect(claim.claimResult?.recoveredQuantity).toBeGreaterThan(0);
			expect(claim.reward?.resourceSlug).toBe('keth_iron');

			const stacks = await listResourceStacksForPilot(db, pilotId);
			const ownedStacks = stacks.map((stack) => ({
				resourceInstanceId: stack.resourceInstanceId,
				resourceSlug: 'keth_iron',
				displayName: 'Keth Iron',
				family: 'structural_alloy' as const,
				quantity: stack.quantity
			}));
			const readiness = analyzeSchematicReadiness({
				schematic: REINFORCED_HULL_PLATE,
				ownedStacks
			});
			const outerPlate = readiness.slots.find((slot) => slot.slotId === 'outer_plate');
			expect(outerPlate?.bestCandidate?.quantity).toBeGreaterThan(0);
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});

	it('seedCommandQueuePilotViaDeploy creates q2 runs for starter hull', async () => {
		const pilotId = await freshPilot('small-seed');
		try {
			await seedCommandQueuePilotViaDeploy(db, pilotId, { commandQueueLength: 2 });
			const run = await getOpenThumperRunForPilot(db, pilotId);
			expect(run?.commandQueueLength).toBe(STARTER_QUEUE_LENGTH);
			expect(run?.runMode).toBe('project_led_command_queue');
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});

	it('keeps q2 claim replay stable for starter deploy script length', async () => {
		const pilotId = await freshPilot('q2-claim');
		try {
			await seedCommandQueuePilotViaDeploy(db, pilotId, { commandQueueLength: 2 });
			const openRun = await getOpenThumperRunForPilot(db, pilotId);
			await queueFullScript(db, openRun!.id, STARTER_COMMAND_QUEUE_SCRIPT);

			const claim = await claimOpenThumperRunForPilot(db, {
				pilotId,
				now: new Date('2026-06-22T17:06:00.000Z'),
				isClaimable: () => true,
				isResolvableRun: () => true,
				validateWindows: () => undefined,
				buildResult: (tx, runRow, windows, claimNow) =>
					resolveThumperRunForStoredWindows(tx, runRow, windows, { now: claimNow }),
				grantResourceReward: true
			});
			expect(claim.status).toBe('claimed');
			if (claim.status !== 'claimed') {
				throw new Error('expected claimed q2 deploy run');
			}
			expect(claim.claimResult?.recoveredQuantity).toBeGreaterThan(0);
		} finally {
			await deletePilotCommandQueueState(db, pilotId);
		}
	});
});
