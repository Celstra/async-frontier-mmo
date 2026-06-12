import { eq, inArray } from 'drizzle-orm';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
	buildActiveRunMeters,
	parseEventWindowSeverity,
	resolveEventWindowOutcome,
	type EventWindowMeterSnapshot
} from '@async-frontier-mmo/domain';
import { createDb } from '../client.js';
import { economyLedger } from '../schema/economyLedger.js';
import { items } from '../schema/items.js';
import { pilots } from '../schema/pilots.js';
import { repairActions } from '../schema/repairActions.js';
import { thumperEventWindows } from '../schema/thumperEventWindows.js';
import { thumperRuns } from '../schema/thumperRuns.js';
import { recordThumperEventWindowResponseForPilot } from './fieldRepair.js';
import {
	ensureStarterThumperPartsForPilot,
	getEquippedThumperPartsForPilot
} from './thumperPartEquipment.js';
import {
	getThumperRunPartSnapshots,
	partModifiersFromRunSnapshots
} from './thumperRunParts.js';
import { deployThumperRunWithEventWindows } from './thumperRunWorkflow.js';
import { getThumperEventWindowsForRun } from './thumperEventWindows.js';

const databaseUrl = process.env.DATABASE_URL;
const describeDb = databaseUrl ? describe : describe.skip;

function partSummary(
	part: { displayName: string; condition: number; integrity: number } | null
) {
	if (!part) return null;
	return {
		displayName: part.displayName,
		condition: part.condition,
		integrity: part.integrity
	};
}

async function deployMetersForRun(
	db: ReturnType<typeof createDb>,
	pilotId: string,
	runId: string
): Promise<EventWindowMeterSnapshot> {
	const [run] = await db.select().from(thumperRuns).where(eq(thumperRuns.id, runId)).limit(1);
	const equipped = await getEquippedThumperPartsForPilot(db, pilotId);
	const partSnapshots = await getThumperRunPartSnapshots(db, runId);
	const partModifiers = partModifiersFromRunSnapshots(partSnapshots);

	return buildActiveRunMeters({
		trueConcentrationPercent: run!.trueConcentrationPercent ?? 67,
		extractionTailMinutes: run!.extractionTailMinutes,
		isPushRun: run!.isPushRun,
		partModifiers,
		equippedParts: {
			drill: partSummary(equipped.drill),
			pump: partSummary(equipped.pump),
			hull: partSummary(equipped.hull)
		},
		runHullCondition: run!.runHullCondition
	});
}

describeDb('thumper event window before/after state', () => {
	const db = createDb(databaseUrl!);
	const testPilotId = `event-window-state-${Date.now()}`;

	beforeAll(async () => {
		await db.insert(pilots).values({ id: testPilotId }).onConflictDoNothing();
		await ensureStarterThumperPartsForPilot(db, testPilotId);
	});

	afterAll(async () => {
		const pilotRuns = await db
			.select({ id: thumperRuns.id })
			.from(thumperRuns)
			.where(eq(thumperRuns.pilotId, testPilotId));
		const runIds = pilotRuns.map((run) => run.id);

		await db.delete(repairActions).where(eq(repairActions.pilotId, testPilotId));

		if (runIds.length > 0) {
			await db
				.delete(thumperEventWindows)
				.where(inArray(thumperEventWindows.thumperRunId, runIds));
			await db.delete(thumperRuns).where(eq(thumperRuns.pilotId, testPilotId));
		}

		await db
			.update(pilots)
			.set({
				equippedScannerItemId: null,
				equippedDrillItemId: null,
				equippedPumpItemId: null,
				equippedHullItemId: null
			})
			.where(eq(pilots.id, testPilotId));
		await db.delete(items).where(eq(items.pilotId, testPilotId));
		await db.delete(economyLedger).where(eq(economyLedger.pilotId, testPilotId));
		await db.delete(pilots).where(eq(pilots.id, testPilotId));
	});

	it('stores before/after snapshots that match resolveEventWindowOutcome', async () => {
		const deployedAt = new Date(Date.now() - 120_000);
		const run = await deployThumperRunWithEventWindows(db, {
			pilotId: testPilotId,
			targetResourceId: 'veyrith_copper',
			runSeed: `state-test-${Date.now()}`,
			isPushRun: false,
			deployedAt,
			durationSeconds: 60,
			windows: [
				{ windowIndex: 1, complication: 'signal_drift', matchingAction: 'signal_tune' },
				{ windowIndex: 2, complication: 'pump_strain', matchingAction: 'clear_pump_problem' }
			]
		});

		const windows = await getThumperEventWindowsForRun(db, run.id);
		const currentMeters = await deployMetersForRun(db, testPilotId, run.id);
		const severity = parseEventWindowSeverity(windows[0]!.severity);
		const expected = resolveEventWindowOutcome({
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			severity,
			chosenResponse: 'hold',
			currentMeters,
			windowIndex: 1,
			totalWindowCount: windows.length
		});

		const outcome = await recordThumperEventWindowResponseForPilot(db, {
			pilotId: testPilotId,
			thumperRunId: run.id,
			windowIndex: 1,
			complication: 'signal_drift',
			matchingAction: 'signal_tune',
			severity: windows[0]!.severity ?? 'minor',
			chosenResponse: 'hold',
			currentMeters,
			totalWindowCount: windows.length,
			runHullCondition: run.runHullCondition,
			runHullIntegrity: run.runHullIntegrity
		});

		expect(outcome.status).toBe('recorded');

		const stored = await getThumperEventWindowsForRun(db, run.id);
		const window = stored.find((row) => row.windowIndex === 1)!;

		expect(window.beforeState).toEqual(expected.beforeState);
		expect(window.afterState).toEqual(expected.afterState);
	});
});
