import {
	buildCraftInstallComparison,
	SURVEY_SCANNER_MK_I,
	thumperPartSlotForSchematic,
	type CraftInstallComparison,
	type CraftResultExplanation,
	type SchematicDefinition
} from '@async-frontier-mmo/domain';
import {
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot,
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
	};
	explanation: CraftResultExplanation;
	comparisonTarget: CraftInstallComparison | null;
	highlights: string[];
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
			(currentClarity === undefined || clarityLine.finalScore > currentClarity)
		) {
			highlights.push('New best scanner');
		}
	}

	return highlights;
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

	if (input.schematic.id === SURVEY_SCANNER_MK_I.id) {
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
			schematicId: input.item.schematicId
		},
		explanation: input.explanation,
		comparisonTarget: comparison,
		highlights: buildHighlights({
			schematic: input.schematic,
			explanation: input.explanation,
			comparison
		})
	};
}
