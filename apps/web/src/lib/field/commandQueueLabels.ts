import type { CommandQueueSlotLength } from '@async-frontier-mmo/domain';
import type { CommandQueueEventKind, ThumperCommand } from '@async-frontier-mmo/domain';
import type { FieldCommandQueueView } from '$lib/server/fieldCommandQueueLoad.js';

type ForecastToken = FieldCommandQueueView['forecast'][number];

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

export function commandQueueSlotLabel(
	index: number,
	queueLength: CommandQueueSlotLength
): string {
	if (index === 0) return 'NEXT';
	if (index === queueLength - 1) return 'EDIT';
	return 'HOLD';
}

export function commandQueueTimingHint(queueLength: CommandQueueSlotLength): string {
	if (queueLength === 3) {
		return 'NEXT resolves on advance. HOLD waits in line. EDIT back now. After advance, EDIT opens for the new back slot.';
	}
	return 'NEXT resolves on advance. EDIT back now. After advance, EDIT opens for the new back slot.';
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
