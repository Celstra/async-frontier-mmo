import { eq } from 'drizzle-orm';
import type { DbExecutor } from '../client.js';
import { resourceInstances } from '../schema/resourceInstances.js';
import { resourceStacks } from '../schema/resourceStacks.js';

export async function listPilotResourceStacksWithInstances(db: DbExecutor, pilotId: string) {
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
		.where(eq(resourceStacks.pilotId, pilotId));

	return rows.filter((row) => row.quantity > 0);
}
