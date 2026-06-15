import type { ResourceStatCode } from 'shared';
import type { ExperimentPulseResult } from './experimentation.js';
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

export type CraftSlotFillSnapshot = {
	slotId: string;
	slotDisplayName: string;
	resourceDisplayName: string;
	family: string;
	inputQuantity: number;
};

export type CraftResultExplanation = {
	summary: string;
	craftMode: CraftMode;
	experimentOutcome: CraftResolution['experimentOutcome'];
	hasMinorFlaw: boolean;
	modeContribution: string;
	properties: CraftPropertyExplanation[];
	slotFillsSnapshot: CraftSlotFillSnapshot[];
	tuningSnapshot: TuningAllocation;
	experimentPulseResults?: ExperimentPulseResult[];
	experimentScrapUnits?: number;
	resourceProvenance: string[];
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

	if (resolution.experimentPulseResults && resolution.experimentPulseResults.length > 0) {
		const summaries = resolution.experimentPulseResults.map(
			(pulse) =>
				`Pulse ${pulse.pulseIndex + 1} (${pulse.push} on ${pulse.propertyId}): ${pulse.outcome.replaceAll('_', ' ')}`
		);
		const scrap =
			resolution.experimentScrapUnits && resolution.experimentScrapUnits > 0
				? ` Scrap overhead: ${resolution.experimentScrapUnits}u.`
				: '';
		return `Experimentation — ${summaries.join('; ')}.${scrap}`;
	}

	return 'Experimentation resolved.';
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
				? 'Experimentation (crit)'
				: 'Experimentation';

	return `${schematic.displayName} crafted from ${resources} via ${mode}. Resource stats set each property base; tuning expressed your priorities; craft mode applied the final variance.`;
}

function buildSlotFillsSnapshot(
	schematic: SchematicDefinition,
	slotFills: SchematicSlotFill[]
): CraftSlotFillSnapshot[] {
	return slotFills.map((fill) => {
		const slot = schematic.slots.find((candidate) => candidate.id === fill.slotId);
		return {
			slotId: fill.slotId,
			slotDisplayName: slot?.displayName ?? fill.slotId,
			resourceDisplayName: fill.resourceDisplayName,
			family: fill.family,
			inputQuantity: slot?.inputQuantity ?? 0
		};
	});
}

function buildResourceProvenance(
	schematic: SchematicDefinition,
	slotFills: SchematicSlotFill[],
	properties: CraftPropertyExplanation[]
): string[] {
	return properties.map((prop) => {
		const topDriver = prop.drivers[0];
		if (!topDriver) {
			return `${prop.displayName} assembled from mixed inputs.`;
		}

		if (topDriver.stat === 'average_oq') {
			return `Average OQ anchored ${prop.displayName}.`;
		}

		const propertyLine = schematic.properties.find((line) => line.id === prop.propertyId);
		const topTerm = propertyLine?.terms
			.map((term) => ({ term, driver: describeTerm(schematic, term, slotFills) }))
			.sort((left, right) => right.driver.weightedContribution - left.driver.weightedContribution)[0]
			?.term;

		if (topTerm?.kind === 'slot_stat') {
			const fill = slotFills.find((candidate) => candidate.slotId === topTerm.slotId);
			const statLabel = STAT_LABELS[topTerm.stat];
			if (fill) {
				return `${fill.resourceDisplayName} carried ${prop.displayName} through ${statLabel}.`;
			}
		}

		return `${topDriver.label} drove ${prop.displayName}.`;
	});
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
		properties,
		slotFillsSnapshot: buildSlotFillsSnapshot(input.schematic, input.slotFills),
		tuningSnapshot: { ...input.tuning },
		experimentPulseResults: input.resolution.experimentPulseResults,
		experimentScrapUnits: input.resolution.experimentScrapUnits,
		resourceProvenance: buildResourceProvenance(input.schematic, input.slotFills, properties)
	};
}
