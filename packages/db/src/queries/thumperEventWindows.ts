import { and, asc, eq, isNull } from 'drizzle-orm';
import type { EventWindowMeterSnapshot } from '@async-frontier-mmo/domain';
import type { DbExecutor } from '../client.js';
import { thumperEventWindows } from '../schema/thumperEventWindows.js';

export type EventWindowStateSnapshot = EventWindowMeterSnapshot;

export async function insertThumperEventWindows(
	db: DbExecutor,
	input: {
		thumperRunId: string;
		windows: Array<{
			windowIndex: number;
			complication: string;
			matchingAction: string;
		}>;
	}
) {
	if (input.windows.length === 0) {
		return [];
	}

	return db
		.insert(thumperEventWindows)
		.values(
			input.windows.map((window) => ({
				thumperRunId: input.thumperRunId,
				windowIndex: window.windowIndex,
				complication: window.complication,
				matchingAction: window.matchingAction
			}))
		)
		.returning();
}

export async function getThumperEventWindowsForRun(db: DbExecutor, thumperRunId: string) {
	return db
		.select()
		.from(thumperEventWindows)
		.where(eq(thumperEventWindows.thumperRunId, thumperRunId))
		.orderBy(asc(thumperEventWindows.windowIndex));
}

export async function recordThumperEventWindowResponse(
	db: DbExecutor,
	input: {
		thumperRunId: string;
		windowIndex: number;
		chosenResponse: string;
		beforeState?: EventWindowStateSnapshot | null;
		afterState?: EventWindowStateSnapshot | null;
	}
) {
	const [row] = await db
		.update(thumperEventWindows)
		.set({
			chosenResponse: input.chosenResponse,
			respondedAt: new Date(),
			beforeState: input.beforeState ?? null,
			afterState: input.afterState ?? null
		})
		.where(
			and(
				eq(thumperEventWindows.thumperRunId, input.thumperRunId),
				eq(thumperEventWindows.windowIndex, input.windowIndex),
				isNull(thumperEventWindows.chosenResponse)
			)
		)
		.returning();

	return row ?? null;
}
