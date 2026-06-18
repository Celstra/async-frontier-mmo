import { WORKSHOP_ACTIVE_SCHEMATIC_IDS } from '@async-frontier-mmo/domain';
import { and, eq, inArray, sql } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { craftingAttempts } from '../schema/craftingAttempts.js';

/** Distinct active workshop schematic ids with at least one completed craft attempt. */
export async function listCompletedWorkshopSchematicIdsForPilot(
	db: DbExecutor,
	pilotId: string
): Promise<string[]> {
	const rows = await db
		.select({ schematicId: craftingAttempts.schematicId })
		.from(craftingAttempts)
		.where(
			and(
				eq(craftingAttempts.pilotId, pilotId),
				eq(craftingAttempts.status, 'completed'),
				inArray(craftingAttempts.schematicId, [...WORKSHOP_ACTIVE_SCHEMATIC_IDS])
			)
		);

	return [...new Set(rows.map((row) => row.schematicId))];
}

export async function countCompletedCraftsForSchematic(
	db: DbExecutor,
	pilotId: string,
	schematicId: string
): Promise<number> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(craftingAttempts)
		.where(
			and(
				eq(craftingAttempts.pilotId, pilotId),
				eq(craftingAttempts.schematicId, schematicId),
				eq(craftingAttempts.status, 'completed')
			)
		);

	return row?.count ?? 0;
}

export async function hasCraftedEachWorkshopThumperPart(
	db: DbExecutor,
	pilotId: string
): Promise<boolean> {
	const completed = await listCompletedWorkshopSchematicIdsForPilot(db, pilotId);
	return WORKSHOP_ACTIVE_SCHEMATIC_IDS.every((schematicId) => completed.includes(schematicId));
}

/** True when the pilot has any completed workshop craft attempt, including reclaimed prototypes. */
export async function hasAnyCompletedWorkshopCraft(
	db: DbExecutor,
	pilotId: string
): Promise<boolean> {
	const [row] = await db
		.select({ count: sql<number>`count(*)::int` })
		.from(craftingAttempts)
		.where(
			and(
				eq(craftingAttempts.pilotId, pilotId),
				eq(craftingAttempts.status, 'completed'),
				inArray(craftingAttempts.schematicId, [...WORKSHOP_ACTIVE_SCHEMATIC_IDS])
			)
		);

	return (row?.count ?? 0) > 0;
}
