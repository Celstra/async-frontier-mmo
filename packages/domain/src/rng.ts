/** FNV-1a 32-bit hash — turns a seed string into a numeric RNG state. */
export function hashSeedToUint32(seed: string): number {
	let hash = 2166136261;
	for (let index = 0; index < seed.length; index += 1) {
		hash ^= seed.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

/** Deterministic PRNG in [0, 1). Same seed string → same sequence. */
export function createSeededRng(seed: string): () => number {
	let state = hashSeedToUint32(seed);
	return () => {
		state = (state + 0x6d2b79f5) >>> 0;
		let t = state;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
}
