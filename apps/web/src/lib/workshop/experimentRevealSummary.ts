import type { CraftResultExplanation, ExperimentPulseResult } from '@async-frontier-mmo/domain';

export type ExperimentRevealSummary = {
	headline: string;
	detail: string;
	matchedSafeCraft: boolean;
};

function formatNameList(items: string[]): string {
	if (items.length === 0) return '';
	if (items.length === 1) return items[0] ?? '';
	if (items.length === 2) return `${items[0]} and ${items[1]}`;
	return `${items.slice(0, -1).join(', ')}, and ${items.at(-1)}`;
}

function pulseShortLabel(pulse: ExperimentPulseResult, propertyName: string): string {
	if (pulse.outcome === 'wasted') {
		return `Pulse ${pulse.pulseIndex + 1} wasted on ${propertyName}`;
	}
	if (pulse.outcome === 'success' && pulse.bandBefore === pulse.bandAfter) {
		return `Pulse ${pulse.pulseIndex + 1} succeeded but ${propertyName} was already at its material cap`;
	}
	if (pulse.outcome === 'success') {
		return `Pulse ${pulse.pulseIndex + 1} raised ${propertyName} (${pulse.bandBefore.replaceAll('_', ' ')} → ${pulse.bandAfter.replaceAll('_', ' ')})`;
	}
	if (pulse.outcome === 'crit_band_loss') {
		return `Pulse ${pulse.pulseIndex + 1} slipped on ${propertyName}`;
	}
	return `Pulse ${pulse.pulseIndex + 1} overdrifted on ${propertyName}`;
}

export function buildExperimentRevealSummary(
	explanation: CraftResultExplanation,
	propertyDisplayName: (propertyId: string) => string
): ExperimentRevealSummary | null {
	if (explanation.craftMode !== 'careful_experiment' || !explanation.experimentPulseResults?.length) {
		return null;
	}

	const improvedLines = explanation.properties
		.filter((line) => Math.round(line.finalScore) > Math.round(line.tunedScore))
		.map((line) => {
			const delta = Math.round(line.finalScore - line.tunedScore);
			return `${line.displayName} +${delta}`;
		});

	const matchedSafeCraft = improvedLines.length === 0;
	const pulseNotes = explanation.experimentPulseResults.map((pulse) =>
		pulseShortLabel(pulse, propertyDisplayName(pulse.propertyId))
	);

	if (!matchedSafeCraft) {
		return {
			headline: `Experiment beat Safe Craft on ${formatNameList(improvedLines)}.`,
			detail: pulseNotes.join(' '),
			matchedSafeCraft: false
		};
	}

	const allWasted = explanation.experimentPulseResults.every((pulse) => pulse.outcome === 'wasted');
	const cappedSuccess = explanation.experimentPulseResults.some(
		(pulse) => pulse.outcome === 'success' && pulse.bandBefore === pulse.bandAfter
	);

	if (allWasted) {
		return {
			headline: 'Experiment matched Safe Craft — both pulses wasted.',
			detail:
				'Same stock and tuning would have landed here without gambling. Try different resources, tuning, or lines with band headroom before experimenting again.',
			matchedSafeCraft: true
		};
	}

	if (cappedSuccess) {
		return {
			headline: 'Experiment matched Safe Craft — material cap stopped the pulses.',
			detail:
				'At least one pulse succeeded but could not climb another band with this bench stock. Swap a socket resource or retune before spending pulses here again.',
			matchedSafeCraft: true
		};
	}

	return {
		headline: 'Experiment matched Safe Craft on every visible line.',
		detail: pulseNotes.join(' '),
		matchedSafeCraft: true
	};
}
