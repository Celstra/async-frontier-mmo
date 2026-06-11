import {
	countFieldRepairKitsForPilot,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	listPilotResourceStacksWithInstances,
	listScannerItemsForPilot,
	listThumperPartItemsForPilot
} from '@async-frontier-mmo/db';
import { getGameDb } from '$lib/server/gameDb';
import { requireFrameChosenPilot } from '$lib/server/pilotGate';
import { resolvePilotId } from '$lib/server/pilot';
import { familyDisplayLabel } from '$lib/displayLabels';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const db = getGameDb();
	const pilotId = resolvePilotId(event);
	const gate = await requireFrameChosenPilot(db, pilotId);
	if (gate) {
		return {
			resourcesByFamily: [],
			scannerItems: [],
			equippedScannerId: null,
			thumperParts: [],
			equippedPartIds: { drill: null, pump: null, hull: null },
			repairKitCount: 0,
			needsFrameChoice: true
		};
	}

	const [
		resourceStacks,
		scannerItems,
		equippedScanner,
		thumperParts,
		equippedParts,
		repairKitCount
	] = await Promise.all([
		listPilotResourceStacksWithInstances(db, pilotId),
		listScannerItemsForPilot(db, pilotId),
		getEquippedScannerForPilot(db, pilotId),
		listThumperPartItemsForPilot(db, pilotId),
		getEquippedThumperPartsForPilot(db, pilotId),
		countFieldRepairKitsForPilot(db, pilotId)
	]);

	// Group resources by family
	const familyGroups = new Map<string, typeof resourceStacks>();
	for (const stack of resourceStacks) {
		const existing = familyGroups.get(stack.family) ?? [];
		existing.push(stack);
		familyGroups.set(stack.family, existing);
	}

	const resourcesByFamily = Array.from(familyGroups.entries()).map(([family, stacks]) => ({
		familyId: family,
		familyLabel: familyDisplayLabel(family),
		stacks: stacks.map((s) => ({
			id: s.stackId,
			resourceInstanceId: s.resourceInstanceId,
			resourceSlug: s.resourceSlug,
			displayName: s.displayName,
			quantity: s.quantity
		}))
	}));

	return {
		needsFrameChoice: false,
		resourcesByFamily,
		scannerItems: scannerItems.map((item) => ({
			id: item.id,
			displayName: item.displayName,
			condition: item.condition,
			integrity: item.integrity,
			surveyClarity: item.propertyScores.survey_clarity ?? 0,
			equipped: item.id === equippedScanner?.id
		})),
		equippedScannerId: equippedScanner?.id ?? null,
		thumperParts: thumperParts.map((item) => ({
			id: item.id,
			schematicId: item.schematicId,
			displayName: item.displayName,
			condition: item.condition,
			integrity: item.integrity,
			slot: item.schematicId.includes('drill')
				? 'drill'
				: item.schematicId.includes('pump')
					? 'pump'
					: 'hull',
			equipped:
				item.id === equippedParts.drill?.id ||
				item.id === equippedParts.pump?.id ||
				item.id === equippedParts.hull?.id
		})),
		equippedPartIds: {
			drill: equippedParts.drill?.id ?? null,
			pump: equippedParts.pump?.id ?? null,
			hull: equippedParts.hull?.id ?? null
		},
		repairKitCount
	};
};
