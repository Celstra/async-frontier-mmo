import type {
	CraftResultExplanation,
	SchematicDefinition
} from '@async-frontier-mmo/domain';
import type { ResourceStatCode } from 'shared';
import { familyDisplayLabel } from '$lib/displayLabels';

const STAT_LABELS: Record<ResourceStatCode, string> = {
	OQ: 'OQ',
	conductivity: 'Conductivity',
	hardness: 'Hardness',
	heat_resistance: 'Heat Resistance',
	malleability: 'Malleability'
};

const PROPERTY_BAND_RANK: Record<string, number> = {
	poor: 0,
	basic: 1,
	solid: 2,
	strong: 3,
	excellent: 4,
	exceptional: 5
};

export const RESULT_LEARNING_FALLBACK =
	'Compare this prototype against your next attempt to see which resource tradeoff moved the result.';

export type ResultLearningNotes =
	| {
			fallbackOnly: false;
			whatHelped: string;
			whatLimited: string;
			tryNext: string;
	  }
	| {
			fallbackOnly: true;
			tryNext: string;
	  };

type SlotDriverRow = {
	propertyName: string;
	slotId: string;
	stat: ResourceStatCode;
	statValue: number;
	resourceName: string;
	finalBandRank: number;
};

function statQualitativeLabel(value: number): 'Strong' | 'Fair' | 'Low' {
	if (value >= 650) return 'Strong';
	if (value >= 500) return 'Fair';
	return 'Low';
}

function slotIdFromDriverLabel(
	schematic: SchematicDefinition,
	label: string
): string | null {
	const slot = schematic.slots.find((candidate) => label.startsWith(`${candidate.displayName} `));
	return slot?.id ?? null;
}

function sharperPartLabel(displayName: string): string {
	return displayName.replace(/^(Basic|Efficient|Reinforced)\s+/, '');
}

function collectSlotDriverRows(
	schematic: SchematicDefinition,
	explanation: CraftResultExplanation
): SlotDriverRow[] {
	const snapshot = explanation.slotFillsSnapshot ?? [];
	const rows: SlotDriverRow[] = [];

	for (const property of explanation.properties) {
		const finalBandRank = PROPERTY_BAND_RANK[property.finalBand] ?? 0;

		for (const driver of property.drivers) {
			if (driver.stat === 'average_oq') {
				continue;
			}

			const slotId = slotIdFromDriverLabel(schematic, driver.label);
			if (!slotId) {
				continue;
			}

			const resourceName =
				snapshot.find((row) => row.slotId === slotId)?.resourceDisplayName ?? null;
			if (!resourceName) {
				continue;
			}

			rows.push({
				propertyName: property.displayName,
				slotId,
				stat: driver.stat,
				statValue: driver.statValue,
				resourceName,
				finalBandRank
			});
		}
	}

	return rows;
}

function buildHelpedLine(row: SlotDriverRow): string {
	return `${row.resourceName}'s ${STAT_LABELS[row.stat]} helped ${row.propertyName}.`;
}

function buildLimitedLine(row: SlotDriverRow): string | null {
	const tier = statQualitativeLabel(row.statValue);
	if (tier === 'Strong') {
		return null;
	}
	return `${tier} ${STAT_LABELS[row.stat]} limited ${row.propertyName}.`;
}

function buildTryNextLine(
	schematic: SchematicDefinition,
	row: SlotDriverRow,
	snapshot: CraftResultExplanation['slotFillsSnapshot']
): string {
	const slotName =
		schematic.slots.find((slot) => slot.id === row.slotId)?.displayName ?? 'that socket';
	const family =
		snapshot?.find((slot) => slot.slotId === row.slotId)?.family ??
		schematic.slots.find((slot) => slot.id === row.slotId)?.requiredFamily ??
		'';
	const familyLabel = family ? familyDisplayLabel(family) : 'bench stock';

	return `For a sharper ${sharperPartLabel(schematic.displayName)}, try higher ${STAT_LABELS[row.stat]} ${familyLabel} in ${slotName}.`;
}

function pickHelpedRow(rows: SlotDriverRow[]): SlotDriverRow | null {
	return [...rows].sort((left, right) => right.statValue - left.statValue)[0] ?? null;
}

function pickLimitedRow(rows: SlotDriverRow[]): SlotDriverRow | null {
	const limitable = rows.filter((row) => statQualitativeLabel(row.statValue) !== 'Strong');
	if (limitable.length === 0) {
		return null;
	}

	return (
		[...limitable].sort((left, right) => {
			if (left.finalBandRank !== right.finalBandRank) {
				return left.finalBandRank - right.finalBandRank;
			}
			return left.statValue - right.statValue;
		})[0] ?? null
	);
}

export function buildResultLearningNotes(
	schematic: SchematicDefinition,
	explanation: CraftResultExplanation
): ResultLearningNotes {
	const rows = collectSlotDriverRows(schematic, explanation);
	if (rows.length === 0) {
		return { fallbackOnly: true, tryNext: RESULT_LEARNING_FALLBACK };
	}

	const helpedCandidate = pickHelpedRow(rows);
	const limitedCandidate = pickLimitedRow(rows);

	if (!helpedCandidate || !limitedCandidate) {
		return { fallbackOnly: true, tryNext: RESULT_LEARNING_FALLBACK };
	}

	if (
		helpedCandidate.slotId === limitedCandidate.slotId &&
		helpedCandidate.stat === limitedCandidate.stat
	) {
		return { fallbackOnly: true, tryNext: RESULT_LEARNING_FALLBACK };
	}

	const whatLimited = buildLimitedLine(limitedCandidate);
	if (!whatLimited) {
		return { fallbackOnly: true, tryNext: RESULT_LEARNING_FALLBACK };
	}

	return {
		fallbackOnly: false,
		whatHelped: buildHelpedLine(helpedCandidate),
		whatLimited,
		tryNext: buildTryNextLine(schematic, limitedCandidate, explanation.slotFillsSnapshot)
	};
}

export function isSafeCraftExplanation(explanation: CraftResultExplanation): boolean {
	return explanation.craftMode === 'safe_craft';
}
