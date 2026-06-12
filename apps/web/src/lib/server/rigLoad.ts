import {
	countFieldRepairKitsForPilot,
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	listPilotRevealedResourceInstanceIds,
	listPilotResourceStacksWithInstances,
	listScannerItemsForPilot,
	listThumperPartItemsForPilot
} from '@async-frontier-mmo/db';
import {
	canRestoreConditionWithFieldRepair,
	maxRunMinutes,
	hullTierFromIntegrity,
	thumperPartSlotForSchematic,
	type ThumperPartSlot
} from '@async-frontier-mmo/domain';
import { fieldStatsFromInstance, type FieldResourceStats } from '$lib/field/resourceStats';
import { familyDisplayLabel, thumperPartSlotLabel } from '$lib/displayLabels';
import type { getGameDb } from './gameDb.js';

export type RigWearBar = {
	label: string;
	value: number;
};

export type RigEquippedPart = {
	slot: ThumperPartSlot;
	slotLabel: string;
	itemId: string | null;
	displayName: string | null;
	condition: number | null;
	integrity: number | null;
	needsRepair: boolean;
};

export type RigPartCandidate = {
	itemId: string;
	displayName: string;
	condition: number;
	integrity: number;
	equipped: boolean;
	canRepair: boolean;
};

export type RigScannerCandidate = {
	itemId: string;
	displayName: string;
	condition: number;
	integrity: number;
	surveyClarity: number;
	equipped: boolean;
	canRepair: boolean;
};

export type RigResourceStack = {
	resourceInstanceId: string;
	displayName: string;
	quantity: number;
	statsRevealed: boolean;
	stats: FieldResourceStats | null;
};

export type RigResourceFamilyGroup = {
	familyId: string;
	familyLabel: string;
	stacks: RigResourceStack[];
};

export type RigScreenData = {
	maxRunMinutes: number;
	maxRunLine: string;
	hullIntegrity: number | null;
	repairKitCount: number;
	hasRepairDebt: boolean;
	repairDebtLine: string | null;
	equippedParts: RigEquippedPart[];
	partCandidates: Record<ThumperPartSlot, RigPartCandidate[]>;
	equippedScanner: {
		itemId: string;
		displayName: string;
		condition: number;
		integrity: number;
		surveyClarity: number;
	} | null;
	scannerCandidates: RigScannerCandidate[];
	resourcesByFamily: RigResourceFamilyGroup[];
};

function needsConditionRepair(condition: number, integrity: number): boolean {
	return canRestoreConditionWithFieldRepair({ condition, integrity });
}

function formatMaxRunLine(minutes: number): string {
	const rounded = Math.max(1, Math.round(minutes));
	return `MAX RUN: ${rounded} MIN — hull limited`;
}

export async function loadRigScreen(
	db: ReturnType<typeof getGameDb>,
	pilotId: string
): Promise<RigScreenData> {
	const [
		resourceStacks,
		revealedInstanceIds,
		scannerItems,
		equippedScanner,
		thumperPartItems,
		equippedParts,
		repairKitCount
	] = await Promise.all([
		listPilotResourceStacksWithInstances(db, pilotId),
		listPilotRevealedResourceInstanceIds(db, pilotId),
		listScannerItemsForPilot(db, pilotId),
		getEquippedScannerForPilot(db, pilotId),
		listThumperPartItemsForPilot(db, pilotId),
		getEquippedThumperPartsForPilot(db, pilotId),
		countFieldRepairKitsForPilot(db, pilotId)
	]);

	const hullIntegrity = equippedParts.hull?.integrity ?? null;
	const hullTier = hullTierFromIntegrity(hullIntegrity ?? 100);
	const runMinutes = hullIntegrity === null ? 0 : maxRunMinutes(hullTier, hullIntegrity);

	const equippedPartRows: RigEquippedPart[] = (['drill', 'pump', 'hull'] as const).map((slot) => {
		const part = equippedParts[slot];
		return {
			slot,
			slotLabel: thumperPartSlotLabel(slot),
			itemId: part?.id ?? null,
			displayName: part?.displayName ?? null,
			condition: part?.condition ?? null,
			integrity: part?.integrity ?? null,
			needsRepair: part ? needsConditionRepair(part.condition, part.integrity) : false
		};
	});

	const partCandidates: Record<ThumperPartSlot, RigPartCandidate[]> = {
		drill: [],
		pump: [],
		hull: []
	};

	for (const item of thumperPartItems) {
		const slot = thumperPartSlotForSchematic(item.schematicId);
		if (!slot) continue;
		partCandidates[slot].push({
			itemId: item.id,
			displayName: item.displayName,
			condition: item.condition,
			integrity: item.integrity,
			equipped:
				item.id === equippedParts.drill?.id ||
				item.id === equippedParts.pump?.id ||
				item.id === equippedParts.hull?.id,
			canRepair: repairKitCount > 0 && needsConditionRepair(item.condition, item.integrity)
		});
	}

	const scannerCandidates: RigScannerCandidate[] = scannerItems.map((item) => ({
		itemId: item.id,
		displayName: item.displayName,
		condition: item.condition,
		integrity: item.integrity,
		surveyClarity: item.propertyScores.survey_clarity ?? 0,
		equipped: item.id === equippedScanner?.id,
		canRepair: repairKitCount > 0 && needsConditionRepair(item.condition, item.integrity)
	}));

	const familyGroups = new Map<string, RigResourceStack[]>();
	for (const stack of resourceStacks) {
		const statsRevealed = revealedInstanceIds.has(stack.resourceInstanceId);
		const existing = familyGroups.get(stack.family) ?? [];
		existing.push({
			resourceInstanceId: stack.resourceInstanceId,
			displayName: stack.displayName,
			quantity: stack.quantity,
			statsRevealed,
			stats: statsRevealed ? fieldStatsFromInstance(stack) : null
		});
		familyGroups.set(stack.family, existing);
	}

	const resourcesByFamily = Array.from(familyGroups.entries()).map(([familyId, stacks]) => ({
		familyId,
		familyLabel: familyDisplayLabel(familyId),
		stacks
	}));

	const damagedEquipped = equippedPartRows.filter((part) => part.needsRepair);
	const hasRepairDebt = damagedEquipped.length > 0;
	const repairDebtLine = hasRepairDebt
		? `Repair debt: ${damagedEquipped.map((part) => part.slotLabel.toLowerCase()).join(', ')} worn after your last run — use a Field Repair kit below.`
		: null;

	return {
		maxRunMinutes: runMinutes,
		maxRunLine: hullIntegrity === null ? 'MAX RUN: — assemble hull in WORKSHOP' : formatMaxRunLine(runMinutes),
		hullIntegrity,
		repairKitCount,
		hasRepairDebt,
		repairDebtLine,
		equippedParts: equippedPartRows,
		partCandidates,
		equippedScanner: equippedScanner
			? {
					itemId: equippedScanner.id,
					displayName: equippedScanner.displayName,
					condition: equippedScanner.condition,
					integrity: equippedScanner.integrity,
					surveyClarity: equippedScanner.propertyScores.survey_clarity ?? 0
				}
			: null,
		scannerCandidates,
		resourcesByFamily
	};
}
