/** Current health of an item or module (0 … integrity). */
export type ItemDurability = {
	condition: number;
	/** Long-term structural ceiling — the maximum condition normal repair can reach. */
	integrity: number;
};

export type SevereDurabilityEvent = {
	conditionLoss: number;
	/** Reserved for catastrophic damage and risky choices — not routine use. */
	integrityLoss?: number;
};
