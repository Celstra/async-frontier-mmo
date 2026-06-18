import {
	buildCraftInstallComparison,
	isWorkshopActiveSchematic,
	pickBestWorkshopCraftItem,
	previewWorkshopItemReclaimFromProvenance,
	SURVEY_SCANNER_MK_I,
	thumperPartSlotForSchematic,
	type CraftInstallComparison,
	type CraftResultExplanation,
	type NamedResourceId,
	type SchematicDefinition
} from '@async-frontier-mmo/domain';
import {
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
	listWorkshopCraftedItemsForPilot,
	type items
} from '@async-frontier-mmo/db';
import type { getGameDb } from './gameDb.js';

type Db = ReturnType<typeof getGameDb>;

export type WorkshopCraftOutcome = {
	status: string;
	item: {
		id: string;
		displayName: string;
		condition: number;
		integrity: number;
		hasMinorFlaw: boolean;
		propertyScores: Record<string, number>;
		schematicId: string;
		favorited: boolean;
	};
	explanation: CraftResultExplanation;
	comparisonTarget: CraftInstallComparison | null;
	highlights: string[];
	reclaimPreview: Array<{
		resourceSlug: string;
		resourceDisplayName: string;
		quantity: number;
	}>;
};

function comparisonItemFromRow(item: typeof items.$inferSelect) {
	return {
		itemId: item.id,
		displayName: item.displayName,
		condition: item.condition,
		integrity: item.integrity,
		propertyScores: item.propertyScores
	};
}

function buildHighlights(input: {
	schematic: SchematicDefinition;
	explanation: CraftResultExplanation;
	comparison: CraftInstallComparison | null;
}): string[] {
	const highlights: string[] = [];

	if (input.explanation.hasMinorFlaw || (input.explanation.experimentScrapUnits ?? 0) > 0) {
		highlights.push('Minor flaw');
	}

	if (input.explanation.properties.some((line) => line.finalBand === 'exceptional')) {
		highlights.push('Exceptional line');
	}

	if (input.comparison?.installKind === 'scanner') {
		const clarityLine = input.explanation.properties.find(
			(line) => line.propertyId === 'survey_clarity'
		);
		const currentClarity = input.comparison.current?.propertyScores.survey_clarity;
		if (
			clarityLine &&
			(currentClarity === undefined || Math.round(clarityLine.finalScore) > Math.round(currentClarity))
		) {
			highlights.push('New best scanner');
		}
	}

	if (
		input.comparison &&
		input.comparison.candidate.itemId !== input.comparison.current?.itemId
	) {
		const candidateTotal = input.schematic.properties.reduce(
			(sum, property) =>
				sum + Math.round(input.comparison?.candidate.propertyScores[property.id] ?? 0),
			0
		);
		const currentTotal = input.schematic.properties.reduce(
			(sum, property) =>
				sum + Math.round(input.comparison?.current?.propertyScores[property.id] ?? 0),
			0
		);
		if (candidateTotal > currentTotal) {
			highlights.push('Beats prior best');
		} else if (candidateTotal === currentTotal) {
			highlights.push('Matches prior best');
		}
	}

	return highlights;
}

async function buildSessionBestComparison(
	db: Db,
	pilotId: string,
	schematic: SchematicDefinition,
	candidate: typeof items.$inferSelect
): Promise<CraftInstallComparison | null> {
	const craftedItems = await listWorkshopCraftedItemsForPilot(db, pilotId);
	const priorItems = craftedItems.filter(
		(item) => item.schematicId === schematic.id && item.id !== candidate.id
	);
	const bestPrior = pickBestWorkshopCraftItem(schematic, priorItems);
	if (!bestPrior) {
		return null;
	}

	return buildCraftInstallComparison({
		schematic,
		candidate: comparisonItemFromRow(candidate),
		current: comparisonItemFromRow(bestPrior)
	});
}

export async function buildWorkshopCraftOutcome(
	db: Db,
	pilotId: string,
	input: {
		schematic: SchematicDefinition;
		status: string;
		item: typeof items.$inferSelect;
		explanation: CraftResultExplanation;
	}
): Promise<WorkshopCraftOutcome> {
	const candidate = comparisonItemFromRow(input.item);
	let comparison: CraftInstallComparison | null = null;

	if (isWorkshopActiveSchematic(input.schematic.id)) {
		comparison = await buildSessionBestComparison(db, pilotId, input.schematic, input.item);
	} else if (input.schematic.id === SURVEY_SCANNER_MK_I.id) {
		const equipped = await getEquippedScannerForPilot(db, pilotId);
		comparison = buildCraftInstallComparison({
			schematic: input.schematic,
			candidate,
			current: equipped ? comparisonItemFromRow(equipped) : null
		});
	} else {
		const slot = thumperPartSlotForSchematic(input.schematic.id);
		if (slot) {
			const equippedParts = await getEquippedThumperPartsForPilot(db, pilotId);
			const current = equippedParts[slot];
			comparison = buildCraftInstallComparison({
				schematic: input.schematic,
				candidate,
				current: current ? comparisonItemFromRow(current) : null
			});
		}
	}

	return {
		status: input.status,
		item: {
			id: input.item.id,
			displayName: input.item.displayName,
			condition: input.item.condition,
			integrity: input.item.integrity,
			hasMinorFlaw: input.item.hasMinorFlaw,
			propertyScores: input.item.propertyScores,
			schematicId: input.item.schematicId,
			favorited: input.item.favoritedAt !== null
		},
		explanation: input.explanation,
		comparisonTarget: comparison,
		highlights: buildHighlights({
			schematic: input.schematic,
			explanation: input.explanation,
			comparison
		}),
		reclaimPreview: buildReclaimPreviewForItem(input.item).map((line) => ({
			resourceSlug: line.resourceSlug,
			resourceDisplayName: line.resourceDisplayName,
			quantity: line.quantity
		}))
	};
}

export function buildReclaimPreviewForItem(item: typeof items.$inferSelect) {
	return previewWorkshopItemReclaimFromProvenance(
		item.provenance.map((line) => ({
			resourceInstanceId: line.resourceInstanceId,
			resourceSlug: line.resourceSlug as NamedResourceId,
			resourceDisplayName: line.resourceDisplayName,
			quantityConsumed: line.quantityConsumed
		}))
	);
}
