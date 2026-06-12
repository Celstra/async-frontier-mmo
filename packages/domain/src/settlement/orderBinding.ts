import type { ResourceFamily } from '../resources/types.js';
import type { SettlementOrder } from './types.js';

export type FamilyStackCandidate = {
	instanceId: string;
	displayName: string;
	unitsSampled: number;
};

export type MissionTrackerState =
	| {
			kind: 'unbound';
			familyLabel: string;
			stackSize: number;
			line: string;
	  }
	| {
			kind: 'bound';
			resourceName: string;
			deliveredUnits: number;
			stackSize: number;
			line: string;
			nudge: string | null;
	  }
	| {
			kind: 'split_stack_warning';
			primaryName: string;
			primaryUnits: number;
			secondaryName: string;
			secondaryUnits: number;
			stackSize: number;
			line: string;
	  };

const FAMILY_LABELS: Record<ResourceFamily, string> = {
	structural_alloy: 'Structural Alloy',
	conductive_metal: 'Conductive Metal',
	reactive_crystal: 'Reactive Crystal'
};

function familyLabel(family: ResourceFamily): string {
	return FAMILY_LABELS[family];
}

/** Turned-in plus bound-stack inventory ready to deliver, capped at order size. */
export function boundStackProgress(
	order: Pick<SettlementOrder, 'stackSize' | 'deliveredUnits' | 'boundInstanceId'>,
	candidates: ReadonlyArray<FamilyStackCandidate>
): number {
	if (order.boundInstanceId === null) {
		return order.deliveredUnits;
	}

	const bound = candidates.find((candidate) => candidate.instanceId === order.boundInstanceId);
	const readyUnits = bound?.unitsSampled ?? 0;
	return Math.min(order.stackSize, order.deliveredUnits + readyUnits);
}

/** Binds the order to the first sampled resource in the family. */
export function bindOrderOnFirstSample(
	order: SettlementOrder,
	input: { instanceId: string; family: ResourceFamily }
): SettlementOrder {
	if (order.boundInstanceId !== null || order.family !== input.family) {
		return order;
	}

	return {
		...order,
		boundInstanceId: input.instanceId
	};
}

export function missionTrackerState(
	order: SettlementOrder,
	candidates: ReadonlyArray<FamilyStackCandidate>,
	options?: { nudgeShown?: boolean }
): MissionTrackerState {
	const stackSize = order.stackSize;
	const family = familyLabel(order.family);

	if (order.boundInstanceId === null) {
		return {
			kind: 'unbound',
			familyLabel: family,
			stackSize,
			line: `${stackSize} units — ONE ${family} stack (no mixing)`
		};
	}

	const bound = candidates.find((candidate) => candidate.instanceId === order.boundInstanceId);
	const boundName = bound?.displayName.toUpperCase() ?? 'BOUND RESOURCE';
	const boundProgressUnits = boundStackProgress(order, candidates);

	const otherCandidates = candidates.filter(
		(candidate) =>
			candidate.instanceId !== order.boundInstanceId && candidate.unitsSampled > 0
	);

	if (otherCandidates.length > 0) {
		const secondary = otherCandidates[0]!;
		return {
			kind: 'split_stack_warning',
			primaryName: boundName,
			primaryUnits: boundProgressUnits,
			secondaryName: secondary.displayName.toUpperCase(),
			secondaryUnits: secondary.unitsSampled,
			stackSize,
			line: `${boundName} ${boundProgressUnits}/${stackSize} · ${secondary.displayName.toUpperCase()} ${secondary.unitsSampled} — only one stack counts`
		};
	}

	const remaining = Math.max(0, stackSize - boundProgressUnits);
	const nudge =
		!options?.nudgeShown && remaining > 0
			? `${remaining} more ${bound?.displayName ?? 'units'} completes this order. Stacks can't mix.`
			: null;

	return {
		kind: 'bound',
		resourceName: boundName,
		deliveredUnits: boundProgressUnits,
		stackSize,
		line: `${boundName} — ${boundProgressUnits}/${stackSize} — single stack`,
		nudge
	};
}

/** Bound open order first, then most progressed, then first open. */
export function pickActiveSettlementOrder(
	orders: ReadonlyArray<SettlementOrder>
): SettlementOrder | null {
	const open = orders.filter((order) => order.status === 'open');
	if (open.length === 0) {
		return null;
	}

	const boundOpen = open.filter((order) => order.boundInstanceId !== null);
	if (boundOpen.length > 0) {
		return boundOpen.reduce((best, order) =>
			order.deliveredUnits > best.deliveredUnits ? order : best
		);
	}

	const progressed = open.filter((order) => order.deliveredUnits > 0);
	if (progressed.length > 0) {
		return progressed.reduce((best, order) =>
			order.deliveredUnits > best.deliveredUnits ? order : best
		);
	}

	return open[0] ?? null;
}
