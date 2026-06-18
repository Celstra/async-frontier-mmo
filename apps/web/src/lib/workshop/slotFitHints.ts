import type { SchematicDefinition } from '@async-frontier-mmo/domain';
import type { ResourceStatCode } from 'shared';

export type SlotFitContext = {
	rewardedStats: ResourceStatCode[];
	affectedPropertyNames: string[];
	mentionsOverallQuality: boolean;
};

export type StackFitHintLine = {
	stat: ResourceStatCode;
	statLabel: string;
	qualitativeLabel: 'Strong' | 'Fair' | 'Low';
	detail: string;
};

const STAT_LABELS: Record<ResourceStatCode, string> = {
	OQ: 'OQ',
	conductivity: 'Conductivity',
	hardness: 'Hardness',
	heat_resistance: 'Heat Resistance',
	malleability: 'Malleability'
};

function formatNameList(items: string[]): string {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0] ?? '';
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function buildSlotFitContext(
	schematic: SchematicDefinition,
	slotId: string
): SlotFitContext {
	const rewardedStats: ResourceStatCode[] = [];
	const rewardedStatSet = new Set<ResourceStatCode>();
	const affectedPropertyNames: string[] = [];
	const affectedPropertySet = new Set<string>();
	let mentionsOverallQuality = false;

	for (const property of schematic.properties) {
		const slotTerms = property.terms.filter(
			(term) => term.kind === 'slot_stat' && term.slotId === slotId
		);
		if (slotTerms.length === 0) {
			continue;
		}

		if (!affectedPropertySet.has(property.displayName)) {
			affectedPropertySet.add(property.displayName);
			affectedPropertyNames.push(property.displayName);
		}

		for (const term of slotTerms) {
			if (term.kind !== 'slot_stat') {
				continue;
			}
			if (!rewardedStatSet.has(term.stat)) {
				rewardedStatSet.add(term.stat);
				rewardedStats.push(term.stat);
			}
		}

		if (property.terms.some((term) => term.kind === 'average_oq')) {
			mentionsOverallQuality = true;
		}
	}

	return {
		rewardedStats,
		affectedPropertyNames,
		mentionsOverallQuality
	};
}

export function buildSlotPickerHint(context: SlotFitContext): string {
	if (context.rewardedStats.length === 0) {
		return 'Compare named bench stock for this slot. No material here is perfect — pick the tradeoff you want to test.';
	}

	const statLabels = context.rewardedStats.map((stat) => STAT_LABELS[stat]);
	const propertyPhrase =
		context.affectedPropertyNames.length > 0
			? ` for ${formatNameList(context.affectedPropertyNames)}`
			: '';

	let hint = `This slot rewards ${formatNameList(statLabels)}${propertyPhrase}. No material here is perfect — pick the tradeoff you want to test.`;

	if (context.mentionsOverallQuality) {
		hint += ' Overall quality (OQ) still nudges every line.';
	}

	return hint;
}

export function statQualitativeLabel(value: number): 'Strong' | 'Fair' | 'Low' {
	if (value >= 650) return 'Strong';
	if (value >= 500) return 'Fair';
	return 'Low';
}

function qualitativeDetail(tier: 'Strong' | 'Fair' | 'Low'): string {
	switch (tier) {
		case 'Strong':
			return 'helps this slot\'s main work.';
		case 'Fair':
			return 'may limit fine adjustment.';
		case 'Low':
			return 'harder to get much from this line.';
	}
}

export function buildStackSlotFitHintLines(
	context: SlotFitContext,
	stats: Record<ResourceStatCode, number>,
	limit = 2
): StackFitHintLine[] {
	return context.rewardedStats.slice(0, limit).map((stat) => {
		const qualitative = statQualitativeLabel(stats[stat] ?? 0);
		return {
			stat,
			statLabel: STAT_LABELS[stat],
			qualitativeLabel: qualitative,
			detail: qualitativeDetail(qualitative)
		};
	});
}
