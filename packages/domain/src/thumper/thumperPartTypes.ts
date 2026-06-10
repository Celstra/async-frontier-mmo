export const THUMPER_PART_SLOTS = ['drill', 'pump', 'hull'] as const;

export type ThumperPartSlot = (typeof THUMPER_PART_SLOTS)[number];

/** Part state snapshotted at deploy — frozen for audit replay (Decision 012). */
export type ThumperPartSnapshot = {
	slot: ThumperPartSlot;
	itemId: string;
	schematicId: string;
	displayName: string;
	propertyScores: Record<string, number>;
	condition: number;
	integrity: number;
};

export type ThumperPartWearDelta = {
	conditionLoss: number;
	integrityLoss?: number;
};

export type ThumperPartRunModifiers = {
	/** Flat bonus to recovered quantity from pump recovery efficiency. */
	pumpRecoveryBonus: number;
	/** Combined condition degradation multiplier (0.5 at 0 Condition — not deleted). */
	performanceMultiplier: number;
};
