import type { NamedResourceId } from '../resources/types.js';
import { WORKSHOP_RECLAIM_RATE, WORKSHOP_RECLAIM_ROUND_DOWN_TO } from './constants.js';

export { WORKSHOP_RECLAIM_RATE, WORKSHOP_RECLAIM_ROUND_DOWN_TO } from './constants.js';

export type WorkshopConsumedResource = {
	resourceSlug: NamedResourceId;
	quantity: number;
};

export type WorkshopConsumedResourceInstance = {
	resourceInstanceId: string;
	resourceSlug: NamedResourceId;
	quantity: number;
};

export type WorkshopItemReclaimState = {
	reclaimedAt: Date | string | null;
};

export function floorReclaimQuantity(
	consumed: number,
	reclaimRate: number = WORKSHOP_RECLAIM_RATE,
	roundDownTo: number = WORKSHOP_RECLAIM_ROUND_DOWN_TO
): number {
	if (consumed <= 0 || reclaimRate <= 0) {
		return 0;
	}
	const raw = consumed * reclaimRate;
	return Math.floor(raw / roundDownTo) * roundDownTo;
}

/** Lossy reclaim — returns named resources consumed by the item, never more than consumed. */
export function computeReclaimReturns(
	consumed: readonly WorkshopConsumedResource[],
	options?: { reclaimRate?: number; roundDownTo?: number }
): WorkshopConsumedResource[] {
	const reclaimRate = options?.reclaimRate ?? WORKSHOP_RECLAIM_RATE;
	const roundDownTo = options?.roundDownTo ?? WORKSHOP_RECLAIM_ROUND_DOWN_TO;
	const returned: WorkshopConsumedResource[] = [];

	for (const line of consumed) {
		const quantity = floorReclaimQuantity(line.quantity, reclaimRate, roundDownTo);
		if (quantity <= 0) {
			continue;
		}
		if (quantity > line.quantity) {
			throw new Error(`Reclaim cannot return more than consumed for ${line.resourceSlug}`);
		}
		returned.push({
			resourceSlug: line.resourceSlug,
			quantity
		});
	}

	return returned;
}

export function aggregateProvenanceByResourceInstance(
	provenance: readonly {
		resourceInstanceId: string;
		resourceSlug: NamedResourceId;
		quantityConsumed: number;
	}[]
): WorkshopConsumedResourceInstance[] {
	const byInstance = new Map<string, WorkshopConsumedResourceInstance>();

	for (const line of provenance) {
		const existing = byInstance.get(line.resourceInstanceId);
		if (existing) {
			if (existing.resourceSlug !== line.resourceSlug) {
				throw new Error(
					`Provenance resource slug mismatch for instance ${line.resourceInstanceId}`
				);
			}
			existing.quantity += line.quantityConsumed;
			continue;
		}

		byInstance.set(line.resourceInstanceId, {
			resourceInstanceId: line.resourceInstanceId,
			resourceSlug: line.resourceSlug,
			quantity: line.quantityConsumed
		});
	}

	return [...byInstance.values()];
}

/** Floor reclaim per resource instance after aggregating duplicate provenance rows. */
export function computeReclaimReturnsByResourceInstance(
	consumed: readonly WorkshopConsumedResourceInstance[],
	options?: { reclaimRate?: number; roundDownTo?: number }
): WorkshopConsumedResourceInstance[] {
	const reclaimRate = options?.reclaimRate ?? WORKSHOP_RECLAIM_RATE;
	const roundDownTo = options?.roundDownTo ?? WORKSHOP_RECLAIM_ROUND_DOWN_TO;
	const returned: WorkshopConsumedResourceInstance[] = [];

	for (const line of consumed) {
		const quantity = floorReclaimQuantity(line.quantity, reclaimRate, roundDownTo);
		if (quantity <= 0) {
			continue;
		}
		if (quantity > line.quantity) {
			throw new Error(
				`Reclaim cannot return more than consumed for instance ${line.resourceInstanceId}`
			);
		}
		returned.push({
			resourceInstanceId: line.resourceInstanceId,
			resourceSlug: line.resourceSlug,
			quantity
		});
	}

	return returned;
}

export function previewWorkshopItemReclaimFromProvenance(
	provenance: readonly {
		resourceInstanceId: string;
		resourceSlug: NamedResourceId;
		resourceDisplayName: string;
		quantityConsumed: number;
	}[]
) {
	const aggregated = aggregateProvenanceByResourceInstance(provenance);
	const returned = computeReclaimReturnsByResourceInstance(aggregated);

	return returned.map((line) => ({
		resourceInstanceId: line.resourceInstanceId,
		resourceSlug: line.resourceSlug,
		resourceDisplayName:
			provenance.find((row) => row.resourceInstanceId === line.resourceInstanceId)
				?.resourceDisplayName ?? line.resourceSlug,
		quantity: line.quantity
	}));
}

export function canReclaimWorkshopItem(item: WorkshopItemReclaimState): boolean {
	return item.reclaimedAt == null;
}

export function assertCanReclaimWorkshopItem(item: WorkshopItemReclaimState): void {
	if (!canReclaimWorkshopItem(item)) {
		throw new Error('Item has already been reclaimed');
	}
}

export function totalConsumedUnits(consumed: readonly WorkshopConsumedResource[]): number {
	return consumed.reduce((sum, line) => sum + line.quantity, 0);
}

export function totalReturnedUnits(returned: readonly WorkshopConsumedResource[]): number {
	return returned.reduce((sum, line) => sum + line.quantity, 0);
}
