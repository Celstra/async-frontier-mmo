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

export function forecastTimelineLabel(offset: number): string {
	if (offset === 0) return 'NOW';
	if (offset === 1) return 'NEXT';
	return `+${offset}`;
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
