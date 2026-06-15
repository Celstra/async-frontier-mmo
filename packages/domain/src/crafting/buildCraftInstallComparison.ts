import { thumperPartSlotForSchematic } from '../thumper/thumperPartSchematics.js';
import type { ThumperPartSlot } from '../thumper/thumperPartTypes.js';
import { getPropertyOutputBand } from './propertyBand.js';
import { SURVEY_SCANNER_MK_I } from './schematics/surveyScannerMkI.js';
import type { SchematicDefinition } from './types.js';

export type CraftInstallComparisonItem = {
	itemId: string;
	displayName: string;
	condition: number;
	integrity: number;
	propertyScores: Record<string, number>;
};

export type CraftInstallComparisonLine = {
	label: string;
	before: string;
	after: string;
};

export type CraftInstallComparison = {
	installKind: 'scanner' | 'thumper_part';
	slotLabel: string;
	thumperSlot?: ThumperPartSlot;
	current: CraftInstallComparisonItem | null;
	candidate: CraftInstallComparisonItem;
	lines: CraftInstallComparisonLine[];
};

function formatScoreBand(score: number): string {
	const band = getPropertyOutputBand(score);
	return `${Math.round(score)} — ${band.replaceAll('_', ' ')}`;
}

function slotLabelFor(schematic: SchematicDefinition, thumperSlot: ThumperPartSlot | null): string {
	if (schematic.id === SURVEY_SCANNER_MK_I.id) {
		return 'Survey scanner';
	}

	switch (thumperSlot) {
		case 'hull':
			return 'Hull slot';
		case 'drill':
			return 'Drill slot';
		case 'pump':
			return 'Pump slot';
		default:
			return 'Equipment slot';
	}
}

/** Before/after install preview for crafted scanners and thumper parts. */
export function buildCraftInstallComparison(input: {
	schematic: SchematicDefinition;
	candidate: CraftInstallComparisonItem;
	current: CraftInstallComparisonItem | null;
}): CraftInstallComparison | null {
	const thumperSlot = thumperPartSlotForSchematic(input.schematic.id);
	const isScanner = input.schematic.id === SURVEY_SCANNER_MK_I.id;

	if (!isScanner && !thumperSlot) {
		return null;
	}

	const lines: CraftInstallComparisonLine[] = [
		{
			label: 'Condition',
			before: input.current ? `${input.current.condition}` : 'Empty slot',
			after: `${input.candidate.condition}`
		},
		{
			label: 'Integrity',
			before: input.current ? `${input.current.integrity}` : 'Empty slot',
			after: `${input.candidate.integrity}`
		}
	];

	for (const property of input.schematic.properties) {
		const afterScore = input.candidate.propertyScores[property.id];
		if (afterScore === undefined) {
			continue;
		}

		const beforeScore = input.current?.propertyScores[property.id];
		lines.push({
			label: property.displayName,
			before: beforeScore !== undefined ? formatScoreBand(beforeScore) : '—',
			after: formatScoreBand(afterScore)
		});
	}

	return {
		installKind: isScanner ? 'scanner' : 'thumper_part',
		slotLabel: slotLabelFor(input.schematic, thumperSlot),
		thumperSlot: thumperSlot ?? undefined,
		current: input.current,
		candidate: input.candidate,
		lines
	};
}
