import { createSeededRng } from '../rng.js';

/** Tunable capacity band — floor must exceed ~130 so tutorial Veyrith claim ≈118 never hits cap on a fresh spot. */
export const DEPOSIT_SPOT_CAPACITY_MIN_UNITS = 150;
export const DEPOSIT_SPOT_CAPACITY_MAX_UNITS = 400;

export type DepositSpotYieldBand = 'rich' | 'thinning' | 'nearly_dry' | 'exhausted';

export const DEPOSIT_SPOT_YIELD_BAND_LABELS: Record<DepositSpotYieldBand, string> = {
	rich: 'Rich deposit',
	thinning: 'Thinning',
	nearly_dry: 'Nearly dry',
	exhausted: 'Exhausted'
};

/**
 * Deterministic finite units per deposit spot (Decision 019 — spots hold finite units).
 */
export function depositSpotCapacityUnits(input: {
	generationSeed: string;
	spotId: string;
}): number {
	const rng = createSeededRng(`deposit-capacity:${input.generationSeed}:${input.spotId}`);
	const span = DEPOSIT_SPOT_CAPACITY_MAX_UNITS - DEPOSIT_SPOT_CAPACITY_MIN_UNITS + 1;
	return DEPOSIT_SPOT_CAPACITY_MIN_UNITS + Math.floor(rng() * span);
}

/** Coarse yield band from remaining capacity share. */
export function depositSpotYieldBand(
	remainingUnits: number,
	capacityUnits: number
): DepositSpotYieldBand {
	if (remainingUnits <= 0 || capacityUnits <= 0) {
		return 'exhausted';
	}

	const share = remainingUnits / capacityUnits;
	if (share > 0.6) {
		return 'rich';
	}
	if (share > 0.25) {
		return 'thinning';
	}
	return 'nearly_dry';
}

export function depositSpotYieldBandLabel(band: DepositSpotYieldBand): string {
	return DEPOSIT_SPOT_YIELD_BAND_LABELS[band];
}

export function depositSpotRemainingUnits(
	capacityUnits: number,
	extractedUnits: number
): number {
	return Math.max(0, capacityUnits - extractedUnits);
}
