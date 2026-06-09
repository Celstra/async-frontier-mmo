/** Decision 010 resource quality bands (internal stat 1–1000). */
export type StatBand =
	| 'poor'
	| 'weak'
	| 'solid'
	| 'strong'
	| 'excellent'
	| 'exceptional';

/** Maps an internal stat value to its survey/crafting quality band. */
export function getStatBand(value: number): StatBand {
	if (value < 1 || value > 1000) {
		throw new RangeError(`Stat value must be 1–1000, got ${value}`);
	}

	if (value <= 249) return 'poor';
	if (value <= 499) return 'weak';
	if (value <= 649) return 'solid';
	if (value <= 799) return 'strong';
	if (value <= 899) return 'excellent';
	return 'exceptional';
}
