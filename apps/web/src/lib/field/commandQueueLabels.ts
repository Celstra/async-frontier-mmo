import type {
	CommandQueueEventKind,
	CommandQueueSlotLength,
	ForecastToken,
	ThumperCommand
} from '@async-frontier-mmo/domain';

const EVENT_KIND_LABELS: Record<CommandQueueEventKind, string> = {
	cargo: 'CARGO',
	heat: 'HEAT',
	hull: 'HULL',
	raid: 'RAID'
};

export function commandQueueCommandLabel(command: ThumperCommand): string {
	return command.toUpperCase();
}

export function commandQueueCommandHint(command: ThumperCommand): string {
	if (command === 'drill') return '+3 loose';
	if (command === 'bank') return 'secure loose';
	if (command === 'brace') return 'guard 2';
	return 'heat -3';
}

export function forecastTimelineLabel(
	offset: number,
	queueLength: CommandQueueSlotLength = 2
): string {
	if (offset === 0) return 'NOW';
	if (queueLength === 2 && offset === 1) return 'NEXT';
	return `+${offset}`;
}

export function commandQueueTimingHint(queueLength: CommandQueueSlotLength): string {
	if (queueLength === 3) {
		return 'Fill empty rows top to bottom. NOW resolves on advance. +1 waits in line. When full, +2 is the editable back slot.';
	}
	return 'Fill empty rows top to bottom. NOW resolves on advance. When full, NEXT is the editable back slot.';
}

export function forecastTokenLabel(token: ForecastToken): string {
	if (!token.kind) {
		return '?';
	}

	const kindLabel = EVENT_KIND_LABELS[token.kind];
	if (token.amount === null) {
		return kindLabel;
	}

	const sign = token.kind === 'cargo' || token.kind === 'heat' ? '+' : '-';
	return `${kindLabel} ${sign}${token.amount}`;
}
