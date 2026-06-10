import type { PropertyOutputBand } from './types.js';

/** Decision 010 crafted property output bands (0–100 score). Never returns Legendary. */
export function getPropertyOutputBand(score: number): PropertyOutputBand {
	if (score < 0 || score > 100) {
		throw new RangeError(`Property score must be 0–100, got ${score}`);
	}

	if (score <= 39) return 'poor';
	if (score <= 54) return 'basic';
	if (score <= 69) return 'solid';
	if (score <= 84) return 'strong';
	if (score <= 94) return 'excellent';
	return 'exceptional';
}
