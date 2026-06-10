import type { ResourceStatCode } from 'shared';
import type { SchematicDefinition, SchematicSlotFill, SchematicWeightTerm, TuningAllocation } from './types.js';
import type { CraftMode, CraftResolution } from './types.js';

const STAT_LABELS: Record<ResourceStatCode, string> = {
	OQ: 'OQ',
	conductivity: 'Conductivity',
	hardness: 'Hardness',
	heat_resistance: 'Heat Resistance',
	malleability: 'Malleability'
};

export type CraftPropertyDriver = {
	label: string;
	stat: ResourceStatCode | 'average_oq';
	statValue: number;
	weightPercent: number;
	weightedContribution: number;
};

export type CraftPropertyExplanation = {
	propertyId: string;
	displayName: string;
	baseScore: number;
	tunedScore: number;
	finalScore: number;
	finalBand: string;
	tuningPoints: number;
	drivers: CraftPropertyDriver[];
};

export type CraftResultExplanation = {
	summary: string;
	craftMode: CraftMode;
	experimentOutcome: CraftResolution['experimentOutcome'];
	hasMinorFlaw: boolean;
	modeContribution: string;
	properties: CraftPropertyExplanation[];
};

function slotDisplayName(schematic: SchematicDefinition, slotId: string): string {
	return schematic.slots.find((slot) => slot.id === slotId)?.displayName ?? slotId;
}

function averageOq(slotFills: SchematicSlotFill[]): number {
	return slotFills.reduce((sum, fill) => sum + fill.stats.OQ, 0) / slotFills.length;
}

function describeTerm(
	schematic: SchematicDefinition,
	term: SchematicWeightTerm,
	slotFills: SchematicSlotFill[]
): CraftPropertyDriver {
	if (term.kind === 'average_oq') {
		const statValue = averageOq(slotFills);
		return {
			label: 'Average OQ',
			stat: 'average_oq',
			statValue,
			weightPercent: Math.round(term.weight * 100),
			weightedContribution: statValue * term.weight
		};
	}

	const fill = slotFills.find((candidate) => candidate.slotId === term.slotId)!;
	const statLabel = STAT_LABELS[term.stat];
	return {
		label: `${slotDisplayName(schematic, term.slotId)} ${statLabel}`,
		stat: term.stat,
		statValue: fill.stats[term.stat],
		weightPercent: Math.round(term.weight * 100),
		weightedContribution: fill.stats[term.stat] * term.weight
	};
}

function modeContributionText(resolution: CraftResolution): string {
	if (resolution.mode === 'safe_craft') {
		return 'Safe Craft applied tuned scores exactly with no variance.';
	}

	switch (resolution.experimentOutcome) {
		case 'boost':
			return 'Careful Experiment succeeded: +3% applied to every property line (cap 100).';
		case 'unchanged':
			return 'Careful Experiment held steady: tuned scores unchanged.';
		case 'minor_flaw':
			return 'Careful Experiment introduced a minor flaw on the crafted item; scores unchanged.';
		default:
			return 'Careful Experiment resolved.';
	}
}

function buildSummary(
	schematic: SchematicDefinition,
	slotFills: SchematicSlotFill[],
	resolution: CraftResolution
): string {
	const resources = slotFills.map((fill) => fill.resourceDisplayName).join(', ');
	const mode =
		resolution.mode === 'safe_craft'
			? 'Safe Craft'
			: resolution.hasMinorFlaw
				? 'Careful Experiment (minor flaw)'
				: resolution.experimentOutcome === 'boost'
					? 'Careful Experiment (+3%)'
					: 'Careful Experiment (unchanged)';

	return `${schematic.displayName} crafted from ${resources} via ${mode}. Resource stats set each property base; tuning expressed your priorities; craft mode applied the final variance.`;
}

/**
 * Decision 008 result explanation — which stats drove which lines, plus tuning/mode contribution.
 */
export function buildCraftResultExplanation(input: {
	schematic: SchematicDefinition;
	slotFills: SchematicSlotFill[];
	tuning: TuningAllocation;
	resolution: CraftResolution;
}): CraftResultExplanation {
	const properties = input.schematic.properties.map((propertyLine) => {
		const resolved = input.resolution.lines.find((line) => line.propertyId === propertyLine.id)!;
		const drivers = propertyLine.terms
			.map((term) => describeTerm(input.schematic, term, input.slotFills))
			.sort((left, right) => right.weightedContribution - left.weightedContribution);

		return {
			propertyId: propertyLine.id,
			displayName: propertyLine.displayName,
			baseScore: resolved.baseScore,
			tunedScore: resolved.tunedScore,
			finalScore: resolved.finalScore,
			finalBand: resolved.finalBand,
			tuningPoints: input.tuning[propertyLine.id] ?? 0,
			drivers
		};
	});

	return {
		summary: buildSummary(input.schematic, input.slotFills, input.resolution),
		craftMode: input.resolution.mode,
		experimentOutcome: input.resolution.experimentOutcome,
		hasMinorFlaw: input.resolution.hasMinorFlaw,
		modeContribution: modeContributionText(input.resolution),
		properties
	};
}
