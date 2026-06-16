import { and, eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { resourceInstances } from '../schema/resourceInstances.js';
import { resourceStacks } from '../schema/resourceStacks.js';
import { WORKSHOP_BENCH_BLOOM_ID } from '../seed/workshopBenchSeed.js';
import { getResourceInstanceById } from './resourceInstances.js';

export type PilotWorkshopBenchStack = {
	stackId: string;
	quantity: number;
	resourceInstanceId: string;
	resourceSlug: string;
	displayName: string;
	family: string;
	statOq: number;
	statConductivity: number;
	statHardness: number;
	statHeatResistance: number;
	statMalleability: number;
};

/** Pilot stacks limited to Decision 024 workshop bench instances (bloom 0). */
export async function listPilotWorkshopBenchStacksWithInstances(
	db: DbExecutor,
	pilotId: string
): Promise<PilotWorkshopBenchStack[]> {
	const rows = await db
		.select({
			stackId: resourceStacks.id,
			quantity: resourceStacks.quantity,
			resourceInstanceId: resourceInstances.id,
			resourceSlug: resourceInstances.resourceSlug,
			displayName: resourceInstances.displayName,
			family: resourceInstances.family,
			statOq: resourceInstances.statOq,
			statConductivity: resourceInstances.statConductivity,
			statHardness: resourceInstances.statHardness,
			statHeatResistance: resourceInstances.statHeatResistance,
			statMalleability: resourceInstances.statMalleability
		})
		.from(resourceStacks)
		.innerJoin(
			resourceInstances,
			eq(resourceStacks.resourceInstanceId, resourceInstances.id)
		)
		.where(
			and(
				eq(resourceStacks.pilotId, pilotId),
				eq(resourceInstances.bloomId, WORKSHOP_BENCH_BLOOM_ID)
			)
		);

	return rows.filter((row) => row.quantity > 0);
}

export async function isWorkshopBenchResourceInstance(
	db: DbExecutor,
	resourceInstanceId: string
): Promise<boolean> {
	const instance = await getResourceInstanceById(db, resourceInstanceId);
	return instance?.bloomId === WORKSHOP_BENCH_BLOOM_ID;
}

export class WorkshopBenchResourceValidationError extends Error {
	constructor(resourceInstanceId: string) {
		super(`Resource is not workshop bench stock: ${resourceInstanceId}`);
		this.name = 'WorkshopBenchResourceValidationError';
	}
}

export async function assertWorkshopBenchCraftInputs(
	db: DbExecutor,
	resourceInstanceIds: readonly string[]
): Promise<void> {
	for (const resourceInstanceId of resourceInstanceIds) {
		if (!(await isWorkshopBenchResourceInstance(db, resourceInstanceId))) {
			throw new WorkshopBenchResourceValidationError(resourceInstanceId);
		}
	}
}
