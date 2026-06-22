import { eq } from 'drizzle-orm';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import {
	COMMAND_QUEUE_RUN_BEATS,
	STARTER_QUEUE_LENGTH,
	STARTER_COMMAND_QUEUE_SCRIPT,
	requiredCommandQueueScriptLength,
	type ThumperCommand
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { thumperRunCommandLog } from '../schema/thumperRunCommandLog.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { insertThumperRun } from './thumperRuns.js';
import {
	appendThumperRunCommandLogEntry,
	getThumperRunCommandsForReplay,
	listThumperRunCommandLogForRun,
	markThumperRunCommandLogResolved,
	replayThumperRunFromCommandLog,
	ThumperCommandLogReplayError,
	updateThumperRunCommandLogCommand
} from './thumperCommandQueueLog.js';
import {
	PROJECT_LED_COMMAND_QUEUE_RUN_MODE,
	claimOpenThumperRunForPilot
} from './thumperRunWorkflow.js';
import { resolveThumperRunForStoredWindows } from './thumperRunResolution.js';
import { thumperRunResults } from '../schema/thumperRunResults.js';
import { ensureStarterThumperPartsForPilot } from './thumperPartEquipment.js';

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

describeDb('thumper_run_command_log persistence', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `command-queue-log-${Date.now()}`;
	let runId = '';

	beforeAll(async () => {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		const run = await insertThumperRun(db, {
			pilotId: testPilotId,
			targetResourceId: 'keth_iron',
			runSeed: 'command-log-replay-seed',
			isPushRun: false,
			deployedAt: new Date('2026-06-22T12:00:00.000Z'),
			durationSeconds: 180,
			runMode: 'project_led_command_queue'
		});
		runId = run!.id;
	});

	beforeEach(async () => {
		await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, runId));
	});

	afterAll(async () => {
		await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, runId));
		await db.delete(thumperRuns).where(eq(thumperRuns.id, runId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('enforces one command per run_id + beat_index', async () => {
		const recordedAt = new Date('2026-06-22T12:01:00.000Z');
		const beatIndex = 900;
		const first = await appendThumperRunCommandLogEntry(db, {
			runId,
			command: 'drill',
			recordedAt,
			beatIndex
		});
		expect(first).toEqual({ status: 'recorded', beatIndex });

		const duplicate = await appendThumperRunCommandLogEntry(db, {
			runId,
			command: 'bank',
			recordedAt,
			beatIndex
		});
		expect(duplicate).toEqual({ status: 'duplicate_beat_index' });
	});

	it('cannot mutate resolved beats', async () => {
		const recordedAt = new Date('2026-06-22T12:02:00.000Z');
		const beatIndex = 1;
		const append = await appendThumperRunCommandLogEntry(db, {
			runId,
			command: 'bank',
			recordedAt,
			beatIndex
		});
		expect(append).toEqual({ status: 'recorded', beatIndex });

		const resolved = await markThumperRunCommandLogResolved(db, {
			runId,
			beatIndex,
			resolvedAt: new Date('2026-06-22T12:02:10.000Z')
		});
		expect(resolved).toEqual({ status: 'resolved' });

		const mutate = await updateThumperRunCommandLogCommand(db, {
			runId,
			beatIndex,
			command: 'vent'
		});
		expect(mutate).toEqual({ status: 'already_resolved' });

		const [row] = await listThumperRunCommandLogForRun(db, runId).then((rows) =>
			rows.filter((entry) => entry.beatIndex === beatIndex)
		);
		expect(row?.command).toBe('bank');
		expect(row?.resolvedAt).not.toBeNull();
	});

	it('persists future queued commands in beat_index order', async () => {
		const baseRecordedAt = new Date('2026-06-22T12:03:00.000Z');
		const queued: ThumperCommand[] = ['drill', 'brace', 'vent'];

		for (const [offset, command] of queued.entries()) {
			const outcome = await appendThumperRunCommandLogEntry(db, {
				runId,
				command,
				recordedAt: new Date(baseRecordedAt.getTime() + offset * 1_000),
				beatIndex: 10 + offset
			});
			expect(outcome).toEqual({ status: 'recorded', beatIndex: 10 + offset });
		}

		const rows = await listThumperRunCommandLogForRun(db, runId);
		const tail = rows.filter((row) => row.beatIndex >= 10);
		expect(tail.map((row) => row.command)).toEqual(queued);
		expect(tail.map((row) => row.beatIndex)).toEqual([10, 11, 12]);
	});

	it('fails closed when replay encounters an invalid stored command', async () => {
		const invalidPilotId = `${testPilotId}-invalid`;
		await db.insert(pilots).values({ id: invalidPilotId }).onConflictDoNothing();
		const invalidRunId = (
			await insertThumperRun(db, {
				pilotId: invalidPilotId,
				targetResourceId: 'keth_iron',
				runSeed: 'invalid-command-seed',
				isPushRun: false,
				deployedAt: new Date('2026-06-22T14:00:00.000Z'),
				durationSeconds: 180,
				runMode: 'project_led_command_queue'
			})
		)!.id;

		try {
			try {
				await db.insert(thumperRunCommandLog).values({
					runId: invalidRunId,
					beatIndex: 0,
					command: 'not_a_real_command',
					recordedAt: new Date('2026-06-22T14:01:00.000Z')
				});
			} catch (error) {
				if (
					typeof error === 'object' &&
					error !== null &&
					'code' in error &&
					(error as { code?: string }).code === '23514'
				) {
					return;
				}
				throw error;
			}

			await expect(getThumperRunCommandsForReplay(db, invalidRunId)).rejects.toBeInstanceOf(
				ThumperCommandLogReplayError
			);
			await expect(
				replayThumperRunFromCommandLog(db, {
					runId: invalidRunId,
					runSeed: 'invalid-command-seed'
				})
			).rejects.toBeInstanceOf(ThumperCommandLogReplayError);
		} finally {
			await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, invalidRunId));
			await db.delete(thumperRuns).where(eq(thumperRuns.id, invalidRunId));
			await db.delete(pilots).where(eq(pilots.id, invalidPilotId));
		}
	});

	it('replays claim commands deterministically from stored log order', async () => {
		const replayPilotId = `${testPilotId}-replay`;
		await db.insert(pilots).values({ id: replayPilotId }).onConflictDoNothing();

		const replayRunId = (
			await insertThumperRun(db, {
				pilotId: replayPilotId,
				targetResourceId: 'keth_iron',
				runSeed: 'command-log-deterministic-seed',
				isPushRun: false,
				deployedAt: new Date('2026-06-22T13:00:00.000Z'),
				durationSeconds: 180,
				runMode: 'project_led_command_queue'
			})
		)!.id;

		try {
			const requiredCommands = requiredCommandQueueScriptLength(STARTER_QUEUE_LENGTH);
			expect(starterCommandScript.length).toBe(requiredCommands);

			const recordedAt = new Date('2026-06-22T13:01:00.000Z');
			for (const [beatIndex, command] of starterCommandScript.entries()) {
				const outcome = await appendThumperRunCommandLogEntry(db, {
					runId: replayRunId,
					command,
					recordedAt: new Date(recordedAt.getTime() + beatIndex * 1_000),
					beatIndex
				});
				expect(outcome).toEqual({ status: 'recorded', beatIndex });
			}

			const commands = await getThumperRunCommandsForReplay(db, replayRunId);
			expect(commands).toEqual(starterCommandScript);

			const first = await replayThumperRunFromCommandLog(db, {
				runId: replayRunId,
				runSeed: 'command-log-deterministic-seed'
			});
			const second = await replayThumperRunFromCommandLog(db, {
				runId: replayRunId,
				runSeed: 'command-log-deterministic-seed'
			});

			expect(first.secured).toBe(second.secured);
			expect(first.lost).toBe(second.lost);
			expect(first.hull).toBe(second.hull);
			expect(first.surgeCount).toBe(second.surgeCount);
			expect(first.ended).toBe(true);
			expect(first.currentBeat).toBe(COMMAND_QUEUE_RUN_BEATS);
		} finally {
			await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, replayRunId));
			await db.delete(thumperRuns).where(eq(thumperRuns.id, replayRunId));
			await db.delete(pilots).where(eq(pilots.id, replayPilotId));
		}
	});

	it('claims through the workflow by replaying stored commands inside the claim transaction', async () => {
		const claimPilotId = `${testPilotId}-claim`;
		await db.insert(pilots).values({ id: claimPilotId }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, claimPilotId, { autoEquip: true });

		const claimRun = (
			await insertThumperRun(db, {
				pilotId: claimPilotId,
				targetResourceId: 'keth_iron',
				runSeed: 'command-log-claim-seed',
				isPushRun: false,
				deployedAt: new Date('2026-06-22T15:00:00.000Z'),
				durationSeconds: 180,
				runMode: PROJECT_LED_COMMAND_QUEUE_RUN_MODE
			})
		)!;

		try {
			const partialRecordedAt = new Date('2026-06-22T15:01:00.000Z');
			await appendThumperRunCommandLogEntry(db, {
				runId: claimRun.id,
				command: 'drill',
				recordedAt: partialRecordedAt,
				beatIndex: 0
			});

			const blocked = await claimOpenThumperRunForPilot(db, {
				pilotId: claimPilotId,
				now: new Date('2026-06-22T15:02:00.000Z'),
				isClaimable: () => true,
				isResolvableRun: () => true,
				validateWindows: () => undefined,
				buildResult: (tx, runRow, windows, now) =>
					resolveThumperRunForStoredWindows(tx, runRow, windows, { now }),
				grantResourceReward: false
			});
			expect(blocked.status).toBe('not_claimable');

			await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, claimRun.id));

			const recordedAt = new Date('2026-06-22T15:03:00.000Z');
			for (const [beatIndex, command] of starterCommandScript.entries()) {
				const outcome = await appendThumperRunCommandLogEntry(db, {
					runId: claimRun.id,
					command,
					recordedAt: new Date(recordedAt.getTime() + beatIndex * 1_000),
					beatIndex
				});
				expect(outcome).toEqual({ status: 'recorded', beatIndex });
			}

			const claim = await claimOpenThumperRunForPilot(db, {
				pilotId: claimPilotId,
				now: new Date('2026-06-22T15:04:00.000Z'),
				isClaimable: () => true,
				isResolvableRun: () => true,
				validateWindows: () => undefined,
				buildResult: (tx, runRow, windows, now) =>
					resolveThumperRunForStoredWindows(tx, runRow, windows, { now }),
				grantResourceReward: false
			});

			expect(claim.status).toBe('claimed');
			if (claim.status !== 'claimed') {
				throw new Error('expected claimed outcome');
			}
			expect(claim.claimResult?.recoveredQuantity).toBeGreaterThan(0);
			expect(claim.claimResult?.resolutionType).toMatch(/^command_queue_/);
		} finally {
			await db.delete(thumperRunResults).where(eq(thumperRunResults.thumperRunId, claimRun.id));
			await db.delete(thumperRunCommandLog).where(eq(thumperRunCommandLog.runId, claimRun.id));
			await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, claimPilotId));
			await deletePilotWithEquippedParts(db, claimPilotId);
		}
	});
});
