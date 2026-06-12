import { FIELD_FAMILY_OPTIONS } from '$lib/field/constants';

export function familyDisplayLabel(familyId: string): string {
	return FIELD_FAMILY_OPTIONS.find((option) => option.id === familyId)?.label ?? familyId;
}

export function spotDisplayLabel(spotId: string, spotIndex?: number): string {
	if (spotIndex !== undefined) {
		return `Spot ${spotIndex + 1}`;
	}
	const match = spotId.match(/:spot:(\d+)$/);
	if (match) {
		return `Spot ${Number.parseInt(match[1], 10) + 1}`;
	}
	return 'Deposit spot';
}

export function resolutionDisplayLabel(resolutionType: string): string {
	if (resolutionType === 'completed') {
		return 'Run completed';
	}
	if (resolutionType === 'recalled') {
		return 'Recalled early — secured units kept';
	}
	return resolutionType;
}

export function thumperPartSlotLabel(slot: string): string {
	if (slot === 'drill') return 'Drill';
	if (slot === 'pump') return 'Pump';
	if (slot === 'hull') return 'Hull';
	return slot;
}

type ExtractionTailOption = { id: string; minutes: number; label: string };

const TAIL_PLAYER_NOTES: Record<string, string> = {
	'15m': 'quick check-in, smallest passive haul',
	'1h': 'standard passive tail',
	'4h': 'longer passive work, larger haul',
	'8h': 'longest tail, biggest passive haul'
};

export function extractionTailPlayerDescription(tail: ExtractionTailOption): string {
	const note = TAIL_PLAYER_NOTES[tail.id] ?? 'passive extraction tail';
	const yieldMultiplier = Math.pow(tail.minutes / 60, 0.5);
	const yieldNote =
		tail.minutes === 60
			? 'full passive yield for this run length'
			: `about ${yieldMultiplier.toFixed(2)}× the passive yield of a 1-hour tail`;
	return `${tail.label} — ${note}; ${yieldNote}`;
}
