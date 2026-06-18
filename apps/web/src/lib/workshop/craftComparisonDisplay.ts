import type { CraftInstallComparisonLine } from '@async-frontier-mmo/domain';

export type ComparisonLineDelta = {
	label: string;
	before: string;
	after: string;
	direction: 'improved' | 'unchanged' | 'worse' | 'unknown';
	scoreDelta: number | null;
};

function parseLeadingScore(value: string): number | null {
	const match = value.match(/^(\d+)/);
	if (!match) {
		return null;
	}
	return Number.parseInt(match[1], 10);
}

export function parseComparisonLine(line: CraftInstallComparisonLine): ComparisonLineDelta {
	const beforeScore = parseLeadingScore(line.before);
	const afterScore = parseLeadingScore(line.after);

	if (beforeScore === null || afterScore === null) {
		return {
			label: line.label,
			before: line.before,
			after: line.after,
			direction: 'unknown',
			scoreDelta: null
		};
	}

	const scoreDelta = afterScore - beforeScore;
	let direction: ComparisonLineDelta['direction'];
	if (scoreDelta > 0) {
		direction = 'improved';
	} else if (scoreDelta < 0) {
		direction = 'worse';
	} else {
		direction = 'unchanged';
	}

	return {
		label: line.label,
		before: line.before,
		after: line.after,
		direction,
		scoreDelta
	};
}

function formatNameList(items: string[]): string {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0] ?? '';
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

export function buildComparisonSummary(deltas: ComparisonLineDelta[]): string | null {
	const propertyDeltas = deltas.filter(
		(line) => line.label !== 'Condition' && line.label !== 'Integrity'
	);
	const improved = propertyDeltas.filter(
		(line) => line.direction === 'improved' && line.scoreDelta !== null
	);
	const unchanged = propertyDeltas.filter((line) => line.direction === 'unchanged');
	const worse = propertyDeltas.filter((line) => line.direction === 'worse' && line.scoreDelta !== null);

	if (improved.length === 0 && worse.length === 0) {
		return 'This craft matches your prior best on every property line.';
	}

	const parts: string[] = [];

	if (improved.length > 0) {
		const gains = improved.map((line) => `${line.label} +${line.scoreDelta}`);
		parts.push(`Improved ${formatNameList(gains)}`);
	}

	if (worse.length > 0) {
		const losses = worse.map((line) => `${line.label} ${line.scoreDelta}`);
		parts.push(`Lower ${formatNameList(losses)}`);
	}

	if (unchanged.length > 0) {
		const steady = unchanged.map((line) => line.label);
		parts.push(`${formatNameList(steady)} held steady`);
	}

	return `${parts.join('. ')}.`;
}

export function hasVisiblePropertyImprovement(deltas: ComparisonLineDelta[]): boolean {
	return deltas.some(
		(line) =>
			line.label !== 'Condition' &&
			line.label !== 'Integrity' &&
			line.direction === 'improved'
	);
}

export function hasVisiblePropertyRegression(deltas: ComparisonLineDelta[]): boolean {
	return deltas.some(
		(line) =>
			line.label !== 'Condition' && line.label !== 'Integrity' && line.direction === 'worse'
	);
}

export function comparisonPanelTitle(deltas: ComparisonLineDelta[]): string {
	if (hasVisiblePropertyImprovement(deltas)) {
		return 'Compare to your best';
	}
	if (hasVisiblePropertyRegression(deltas)) {
		return 'Below prior best';
	}
	return 'Matches prior best';
}
