import { eq, gt } from 'drizzle-orm';
import type { Db } from '../client.js';
import { blooms } from '../schema/blooms.js';
import { resourceInstances } from '../schema/resourceInstances.js';

/** Test-only undo for a single rotateActiveBloom — not part of the runtime API. */
export async function restoreBloomRotationForTest(
	db: Db,
	rotation: { previousBloomId: number; newBloomId: number }
) {
	await db.transaction(async (tx) => {
		await tx
			.delete(resourceInstances)
			.where(gt(resourceInstances.bloomId, rotation.previousBloomId));
		await tx.delete(blooms).where(gt(blooms.id, rotation.previousBloomId));
		await tx
			.update(resourceInstances)
			.set({ extinctAt: null })
			.where(eq(resourceInstances.bloomId, rotation.previousBloomId));
		await tx
			.update(blooms)
			.set({ rotatedAt: null })
			.where(eq(blooms.id, rotation.previousBloomId));
	});
}
