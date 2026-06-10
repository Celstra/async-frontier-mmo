import { getActiveBloomId, getResourceInstanceByBloomSlug } from '@async-frontier-mmo/db';
import { getRedMesaResource, RED_MESA_BLOOM_RESOURCES, type NamedResourceId } from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

export async function resolveTargetDisplayName(
	db: ReturnType<typeof getGameDb>,
	targetResourceId: string
): Promise<string> {
	if (targetResourceId in RED_MESA_BLOOM_RESOURCES) {
		return getRedMesaResource(targetResourceId as NamedResourceId).displayName;
	}

	const activeBloomId = await getActiveBloomId(db);
	const instance = await getResourceInstanceByBloomSlug(db, activeBloomId, targetResourceId);
	return instance?.displayName ?? targetResourceId;
}
