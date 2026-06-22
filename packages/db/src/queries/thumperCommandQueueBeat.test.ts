import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	COMMAND_QUEUE_RUN_BEATS,
	MEDIUM_COMMAND_QUEUE_SLOT_LENGTH,
	STARTER_QUEUE_LENGTH,
	STARTER_COMMAND_QUEUE_SCRIPT,
	requiredCommandQueueScriptLength,
	starterScriptForQueueLength,
	type ThumperCommand
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { thumperRunCommandLog } from '../schema/thumperRunCommandLog.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import {
	advanceCommandQueueBeatForPilot,
	buildCommandQueueFieldView,
	loadCommandQueueFieldViewForPilot,
	recallCommandQueueRunForPilot,
	submitCommandQueueSlotForPilot
} from './thumperCommandQueueBeat.js';
import {
	appendThumperRunCommandLogEntry,
	updateThumperRunCommandLogCommand
} from './thumperCommandQueueLog.js';
import { assertCommandQueueRunClaimable } from './thumperCommandQueueRuns.js';
import { PROJECT_LED_COMMAND_QUEUE_RUN_MODE } from './thumperRunWorkflow.js';
import { insertThumperRun } from './thumperRuns.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';
import { claimOpenThumperRunForPilot } from './thumperRunWorkflow.js';
import { resolveThumperRunForStoredWindows } from './thumperRunResolution.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

const starterCommandScript: ThumperCommand[] = [...STARTER_COMMAND_QUEUE_SCRIPT];

async function deletePilotWithEquippedParts(
	db: ReturnType<typeof createDb>,
	pilotId: string
) {
	await db
		.update(pilots)
		.set({
			equippedScannerItemId: null,
			equippedDrillItemId: null,
			equippedPumpItemId: null,
			equippedHullItemId: null
		})
		.where(eq(pilots.id, pilotId));
	await db.delete(items).where(eq(items.pilotId, pilotId));
	await db.delete(economyLedger).where(eq(economyLedger.pilotId, pilotId));
	await db.delete(pilots).where(eq(pilots.id, pilotId));
}

describeDb('thumper command queue beat loop', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `command-queue-beat-${Date.now()}`;
	let runId = '';

	beforeAll(async () => {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId, { autoEquip: true });
		const run = (
			await insertThumperRun(db, {
				pilotId: testPilotId,
				targetResourceId: 'keth_iron',
				runSeed: 'command-queue-beat-seed',
				isPushRun: false,
				deployedAt: new Date('2026-06-22T16:00:00.000Z'),
				durationSeconds: 180,
				runMode: PROJECT_LED_COMMAND_QUEUE_RUN_MODE
			})
		)!;
		runId = run.id;
	});

	beforeEach(async () => {
		await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, runId));
		await db
			.update(thumperRuns)
			.set({
				defenseActionLog: [],
				claimedAt: null,
				commandQueueLength: STARTER_QUEUE_LENGTH
			})
			.where(eq(thumperRuns.id, runId));
		await db.delete(thumperRunResults).where(eq(thumperRunResults.thumperRunId, runId));
	});

	afterAll(async () => {
		await db.delete(thumperRunResults).where(eq(thumperRunResults.thumperRunId, runId));
		await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, runId));
		await db.delete(thumperRuns).where(eq(thumperRuns.id, runId));
		await deletePilotWithEquippedParts(db, testPilotId);
	});

	it('fills only the back slot and replays FIELD state from stored commands', async () => {
		const now = new Date('2026-06-22T16:01:00.000Z');
		const first = await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'drill',
			now
		});
		expect(first.status).toBe('recorded');
		if (first.status !== 'recorded') {
			throw new Error('expected recorded');
		}
		expect(first.beatIndex).toBe(0);

		const blocked = await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'vent',
			now: new Date(now.getTime() + 1_000)
		});
		expect(blocked.status).toBe('recorded');
		if (blocked.status !== 'recorded') {
			throw new Error('expected recorded');
		}
		expect(blocked.beatIndex).toBe(1);

		const overfill = await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'brace',
			now: new Date(now.getTime() + 2_000)
		});
		expect(overfill.status).toBe('updated');

		const second = await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'bank',
			now: new Date(now.getTime() + 3_000)
		});
		expect(second.status).toBe('updated');
		if (second.status !== 'updated') {
			throw new Error('expected updated back-slot change');
		}
		expect(second.beatIndex).toBe(1);

		const view = await loadCommandQueueFieldViewForPilot(db, testPilotId);
		expect(view).not.toBeNull();
		expect(view!.queueSlots.map((slot) => slot.command)).toEqual(['drill', 'bank']);
		expect(view!.queueSlots[1]?.isBackSlot).toBe(true);
		expect(view!.canAdvanceBeat).toBe(true);
		expect(view!.state.secured).toBe(0);
		expect(view!.forecast).toHaveLength(STARTER_QUEUE_LENGTH);
	});

	it('cannot update a resolved beat', async () => {
		const now = new Date('2026-06-22T16:02:00.000Z');
		await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'drill',
			now
		});
		await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'bank',
			now: new Date(now.getTime() + 1_000)
		});

		const advanced = await advanceCommandQueueBeatForPilot(db, {
			pilotId: testPilotId,
			now: new Date(now.getTime() + 2_000)
		});
		expect(advanced.status).toBe('advanced');

		const mutate = await updateThumperRunCommandLogCommand(db, {
			runId,
			beatIndex: 0,
			command: 'vent'
		});
		expect(mutate.status).toBe('already_resolved');
	});

	it('advances beats from stored commands and blocks claim until the script is complete', async () => {
		const now = new Date('2026-06-22T16:03:00.000Z');
		await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'drill',
			now
		});
		await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'bank',
			now: new Date(now.getTime() + 1_000)
		});

		const partialClaim = await assertCommandQueueRunClaimable(db, {
			id: runId,
			runSeed: 'command-queue-beat-seed'
		});
		expect(partialClaim.status).toBe('in_progress');

		for (let beat = 0; beat < COMMAND_QUEUE_RUN_BEATS; beat += 1) {
			const advanced = await advanceCommandQueueBeatForPilot(db, {
				pilotId: testPilotId,
				now: new Date(now.getTime() + (beat + 2) * 1_000)
			});
			expect(advanced.status).toBe('advanced');

			const nextIndex = beat + STARTER_QUEUE_LENGTH;
			if (nextIndex < starterCommandScript.length) {
				const fill = await submitCommandQueueSlotForPilot(db, {
					pilotId: testPilotId,
					command: starterCommandScript[nextIndex]!,
					now: new Date(now.getTime() + (beat + 3) * 1_000)
				});
				expect(['recorded', 'updated']).toContain(fill.status);
			}
		}

		const [run] = await db.select().from(thumperRuns).where(eq(thumperRuns.id, runId));
		const rows = await db
			.select()
			.from(thumperRunCommandLog)
			.where(eq(thumperRunCommandLog.runId, runId));
		const view = buildCommandQueueFieldView({
			run: run!,
			rows,
			scannerQuality: 'basic'
		});
		expect(view.state.ended).toBe(true);
		expect(view.canClaim).toBe(true);

		const claimable = await assertCommandQueueRunClaimable(db, {
			id: runId,
			runSeed: 'command-queue-beat-seed'
		});
		expect(claimable.status).toBe('ended');
	});

	it('recalls without a new migration and allows claim through the recall marker', async () => {
		const now = new Date('2026-06-22T16:04:00.000Z');
		await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'drill',
			now
		});
		await submitCommandQueueSlotForPilot(db, {
			pilotId: testPilotId,
			command: 'bank',
			now: new Date(now.getTime() + 1_000)
		});
		await advanceCommandQueueBeatForPilot(db, {
			pilotId: testPilotId,
			now: new Date(now.getTime() + 2_000)
		});

		const recalled = await recallCommandQueueRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date(now.getTime() + 3_000)
		});
		expect(recalled.status).toBe('recalled');
		if (recalled.status !== 'recalled') {
			throw new Error('expected recalled');
		}
		expect(recalled.view.recalled).toBe(true);
		expect(recalled.view.canClaim).toBe(true);

		const claimable = await assertCommandQueueRunClaimable(db, {
			id: runId,
			runSeed: 'command-queue-beat-seed',
			defenseActionLog: { commandQueueRecalledAt: now.toISOString() }
		});
		expect(claimable.status).toBe('ended');
		if (claimable.status !== 'ended') {
			throw new Error('expected ended replay');
		}
		expect(claimable.state.recalled).toBe(true);

		const claim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date('2026-06-22T16:05:00.000Z'),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => undefined,
			buildResult: (tx, runRow, windows, claimNow) =>
				resolveThumperRunForStoredWindows(tx, runRow, windows, { now: claimNow }),
			grantResourceReward: false
		});
		expect(claim.status).toBe('claimed');
		if (claim.status !== 'claimed') {
			throw new Error('expected claimed');
		}
		expect(claim.claimResult?.resolutionType).toBe('command_queue_recalled');
	});

	it('reads persisted queue length for FIELD view slots and forecast', async () => {
		await db
			.update(thumperRuns)
			.set({ commandQueueLength: MEDIUM_COMMAND_QUEUE_SLOT_LENGTH })
			.where(eq(thumperRuns.id, runId));

		const view = await loadCommandQueueFieldViewForPilot(db, testPilotId);
		expect(view).not.toBeNull();
		expect(view!.queueLength).toBe(3);
		expect(view!.queueSlots).toHaveLength(3);
		expect(view!.forecast).toHaveLength(3);
	});

	it('requires the persisted queue length script count before workflow claim', async () => {
		await db
			.update(thumperRuns)
			.set({ commandQueueLength: MEDIUM_COMMAND_QUEUE_SLOT_LENGTH })
			.where(eq(thumperRuns.id, runId));

		const starterLength = requiredCommandQueueScriptLength(STARTER_QUEUE_LENGTH);
		const mediumScript = starterScriptForQueueLength(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH);
		expect(mediumScript).toHaveLength(
			requiredCommandQueueScriptLength(MEDIUM_COMMAND_QUEUE_SLOT_LENGTH)
		);

		const recordedAt = new Date('2026-06-22T16:06:00.000Z');
		for (const [beatIndex, command] of mediumScript.slice(0, starterLength).entries()) {
			const outcome = await appendThumperRunCommandLogEntry(db, {
				runId,
				command,
				recordedAt: new Date(recordedAt.getTime() + beatIndex * 1_000),
				beatIndex
			});
			expect(outcome).toEqual({ status: 'recorded', beatIndex });
		}

		const blocked = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date('2026-06-22T16:07:00.000Z'),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => undefined,
			buildResult: (tx, runRow, windows, claimNow) =>
				resolveThumperRunForStoredWindows(tx, runRow, windows, { now: claimNow }),
			grantResourceReward: false
		});
		expect(blocked.status).toBe('not_claimable');

		const finalBeatIndex = starterLength;
		const finalOutcome = await appendThumperRunCommandLogEntry(db, {
			runId,
			command: mediumScript[finalBeatIndex]!,
			recordedAt: new Date(recordedAt.getTime() + finalBeatIndex * 1_000),
			beatIndex: finalBeatIndex
		});
		expect(finalOutcome).toEqual({ status: 'recorded', beatIndex: finalBeatIndex });

		const claim = await claimOpenThumperRunForPilot(db, {
			pilotId: testPilotId,
			now: new Date('2026-06-22T16:08:00.000Z'),
			isClaimable: () => true,
			isResolvableRun: () => true,
			validateWindows: () => undefined,
			buildResult: (tx, runRow, windows, claimNow) =>
				resolveThumperRunForStoredWindows(tx, runRow, windows, { now: claimNow }),
			grantResourceReward: false
		});
		expect(claim.status).toBe('claimed');
		if (claim.status !== 'claimed') {
			throw new Error('expected claimed');
		}
		expect(claim.claimResult?.resolutionType).toBe('command_queue_completed');
		expect(claim.claimResult?.recoveredQuantity).toBeGreaterThan(0);
	});
});
