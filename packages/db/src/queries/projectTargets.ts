import {
	REINFORCED_HULL_PLATE,
	type ResourceFamily,
	type SchematicDefinition
} from '@async-frontier-mmo/domain';
import { and, eq, isNull } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { pilotProjectTargets } from '../schema/pilotProjectTargets.js';
import { getPilotDepositSample } from './prospecting.js';
import { getResourceInstanceById } from './resourceInstances.js';

export const DEFAULT_PROJECT_SCHEMATIC_ID = REINFORCED_HULL_PLATE.id;
export const DEFAULT_PROJECT_TARGET_SLOT_ID = 'outer_plate';

export type PilotProjectMaterialSecuredEvidence = {
	claimResultId: string;
	resourceStackId: string;
	/** Quantity granted on the claim that crossed project need. */
	crossingClaimQuantity: number;
	/** Pilot target-resource stack total at secure time (authoritative secured amount). */
	securedStackQuantity: number;
	projectNeedUnits: number;
	spotRemainingUnits: number;
};

export type PilotProjectTarget = {
	pilotId: string;
	schematicId: string;
	targetSlotId: string;
	targetFamily: ResourceFamily;
	targetResourceInstanceId: string | null;
	sampledSpotId: string | null;
	materialSecuredAt: Date | null;
	securedClaimResultId: string | null;
	securedResourceStackId: string | null;
	/** Target-resource stack total when material was secured. */
	securedQuantity: number | null;
	securedProjectNeedUnits: number | null;
	securedSpotRemainingUnits: number | null;
	updatedAt: Date;
};

function rowToTarget(row: typeof pilotProjectTargets.$inferSelect): PilotProjectTarget {
	return {
		pilotId: row.pilotId,
		schematicId: row.schematicId,
		targetSlotId: row.targetSlotId,
		targetFamily: row.targetFamily as ResourceFamily,
		targetResourceInstanceId: row.targetResourceInstanceId,
		sampledSpotId: row.sampledSpotId,
		materialSecuredAt: row.materialSecuredAt,
		securedClaimResultId: row.securedClaimResultId,
		securedResourceStackId: row.securedResourceStackId,
		securedQuantity: row.securedQuantity,
		securedProjectNeedUnits: row.securedProjectNeedUnits,
		securedSpotRemainingUnits: row.securedSpotRemainingUnits,
		updatedAt: row.updatedAt
	};
}

function targetFamilyForSlot(schematic: SchematicDefinition, slotId: string): ResourceFamily | null {
	const slot = schematic.slots.find((entry) => entry.id === slotId);
	return slot?.requiredFamily ?? null;
}

function schematicById(schematicId: string): SchematicDefinition | null {
	if (schematicId === REINFORCED_HULL_PLATE.id) {
		return REINFORCED_HULL_PLATE;
	}
	return null;
}

async function resourceMatchesProjectTargetFamily(
	db: DbExecutor,
	target: PilotProjectTarget,
	resourceInstanceId: string
): Promise<boolean> {
	const resource = await getResourceInstanceById(db, resourceInstanceId);
	return resource !== null && resource.family === target.targetFamily;
}

export async function getPilotProjectTarget(
	db: DbExecutor,
	pilotId: string
): Promise<PilotProjectTarget | null> {
	const [row] = await db
		.select()
		.from(pilotProjectTargets)
		.where(eq(pilotProjectTargets.pilotId, pilotId))
		.limit(1);

	return row ? rowToTarget(row) : null;
}

export async function ensurePilotProjectTarget(
	db: DbExecutor,
	pilotId: string,
	now = new Date()
): Promise<PilotProjectTarget> {
	const existing = await getPilotProjectTarget(db, pilotId);
	if (existing) {
		return existing;
	}

	const targetFamily =
		targetFamilyForSlot(REINFORCED_HULL_PLATE, DEFAULT_PROJECT_TARGET_SLOT_ID) ?? 'structural_alloy';

	const [row] = await db
		.insert(pilotProjectTargets)
		.values({
			pilotId,
			schematicId: DEFAULT_PROJECT_SCHEMATIC_ID,
			targetSlotId: DEFAULT_PROJECT_TARGET_SLOT_ID,
			targetFamily,
			updatedAt: now
		})
		.returning();

	return rowToTarget(row!);
}

export async function setPilotProjectTargetSlot(
	db: DbExecutor,
	input: {
		pilotId: string;
		schematicId: string;
		targetSlotId: string;
		now?: Date;
	}
): Promise<PilotProjectTarget> {
	const schematic = schematicById(input.schematicId);
	if (!schematic) {
		throw new Error(`Unknown project schematic: ${input.schematicId}`);
	}

	const targetFamily = targetFamilyForSlot(schematic, input.targetSlotId);
	if (!targetFamily) {
		throw new Error(`Unknown target slot ${input.targetSlotId} for ${input.schematicId}`);
	}

	const now = input.now ?? new Date();
	await ensurePilotProjectTarget(db, input.pilotId, now);

	const [row] = await db
		.update(pilotProjectTargets)
		.set({
			schematicId: input.schematicId,
			targetSlotId: input.targetSlotId,
			targetFamily,
			targetResourceInstanceId: null,
			sampledSpotId: null,
			materialSecuredAt: null,
			securedClaimResultId: null,
			securedResourceStackId: null,
			securedQuantity: null,
			securedProjectNeedUnits: null,
			securedSpotRemainingUnits: null,
			updatedAt: now
		})
		.where(eq(pilotProjectTargets.pilotId, input.pilotId))
		.returning();

	return rowToTarget(row!);
}

export async function setPilotProjectTargetResource(
	db: DbExecutor,
	input: { pilotId: string; resourceInstanceId: string | null; now?: Date }
): Promise<PilotProjectTarget | null> {
	const existing = await getPilotProjectTarget(db, input.pilotId);
	if (!existing) {
		return null;
	}

	if (
		input.resourceInstanceId !== null &&
		!(await resourceMatchesProjectTargetFamily(db, existing, input.resourceInstanceId))
	) {
		return null;
	}

	const now = input.now ?? new Date();
	const [row] = await db
		.update(pilotProjectTargets)
		.set({
			targetResourceInstanceId: input.resourceInstanceId,
			updatedAt: now
		})
		.where(eq(pilotProjectTargets.pilotId, input.pilotId))
		.returning();

	return row ? rowToTarget(row) : null;
}

export async function setPilotProjectSampledSpot(
	db: DbExecutor,
	input: {
		pilotId: string;
		spotId: string;
		resourceInstanceId: string;
		now?: Date;
	}
): Promise<PilotProjectTarget | null> {
	const existing = await getPilotProjectTarget(db, input.pilotId);
	if (!existing) {
		return null;
	}

	if (!(await resourceMatchesProjectTargetFamily(db, existing, input.resourceInstanceId))) {
		return null;
	}

	const sample = await getPilotDepositSample(db, {
		pilotId: input.pilotId,
		resourceInstanceId: input.resourceInstanceId,
		spotId: input.spotId
	});
	if (!sample) {
		return null;
	}

	const now = input.now ?? new Date();
	const [row] = await db
		.update(pilotProjectTargets)
		.set({
			sampledSpotId: input.spotId,
			targetResourceInstanceId: input.resourceInstanceId,
			updatedAt: now
		})
		.where(eq(pilotProjectTargets.pilotId, input.pilotId))
		.returning();

	return row ? rowToTarget(row) : null;
}

export type PilotProjectRunSnapshot = {
	schematicId: string;
	targetSlotId: string;
	targetFamily: string;
};

export async function markPilotProjectMaterialSecured(
	db: DbExecutor,
	input: {
		pilotId: string;
		now?: Date;
		runSnapshot: PilotProjectRunSnapshot;
		evidence: PilotProjectMaterialSecuredEvidence;
	}
): Promise<PilotProjectTarget | null> {
	const now = input.now ?? new Date();
	const [row] = await db
		.update(pilotProjectTargets)
		.set({
			materialSecuredAt: now,
			securedClaimResultId: input.evidence.claimResultId,
			securedResourceStackId: input.evidence.resourceStackId,
			securedQuantity: input.evidence.securedStackQuantity,
			securedProjectNeedUnits: input.evidence.projectNeedUnits,
			securedSpotRemainingUnits: input.evidence.spotRemainingUnits,
			updatedAt: now
		})
		.where(
			and(
				eq(pilotProjectTargets.pilotId, input.pilotId),
				eq(pilotProjectTargets.schematicId, input.runSnapshot.schematicId),
				eq(pilotProjectTargets.targetSlotId, input.runSnapshot.targetSlotId),
				eq(pilotProjectTargets.targetFamily, input.runSnapshot.targetFamily),
				isNull(pilotProjectTargets.materialSecuredAt)
			)
		)
		.returning();

	return row ? rowToTarget(row) : null;
}

export function projectNeedUnitsForTarget(
	schematicId: string,
	targetSlotId: string
): number | null {
	const schematic = schematicById(schematicId);
	if (!schematic) {
		return null;
	}
	const slot = schematic.slots.find((entry) => entry.id === targetSlotId);
	return slot?.inputQuantity ?? null;
}

export async function clearPilotProjectTarget(db: DbExecutor, pilotId: string): Promise<void> {
	await db.delete(pilotProjectTargets).where(eq(pilotProjectTargets.pilotId, pilotId));
}
