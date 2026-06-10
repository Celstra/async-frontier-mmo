import type { ResourceStatCode } from 'shared';
import type { CompleteResourceStatMap, ResourceFamily } from '../resources/types.js';

/** One ingredient slot on a schematic (family requirement only — named resource chosen at craft time). */
export type SchematicSlotDefinition = {
	id: string;
	displayName: string;
	requiredFamily: ResourceFamily;
	/** Claim-units consumed from the chosen stack (Decision 021-C). */
	inputQuantity: number;
};

/** One weighted term in a property line formula (Decision 010). */
export type SchematicWeightTerm =
	| {
			kind: 'slot_stat';
			slotId: string;
			stat: ResourceStatCode;
			/** Share of the weighted total, e.g. 0.6 for 60%. Terms on a line must sum to 1. */
			weight: number;
	  }
	| {
			kind: 'average_oq';
			weight: number;
	  };

/** One output property line (preview + tuning target). */
export type SchematicPropertyLine = {
	id: string;
	displayName: string;
	terms: SchematicWeightTerm[];
};

/**
 * Versioned schematic definition — data, not code (Decision 012).
 * Bump `version` when weights or slots change; old crafts remain auditable.
 */
export type SchematicDefinition = {
	id: string;
	version: number;
	displayName: string;
	slots: SchematicSlotDefinition[];
	properties: SchematicPropertyLine[];
};

/** Resource placed in a slot at craft/preview time. Stats are read-only inputs. */
export type SchematicSlotFill = {
	slotId: string;
	/** Persisted instance slug — not limited to the static Red Mesa catalog. */
	resourceSlug: string;
	/** Player-facing name from the resource instance row. */
	resourceDisplayName: string;
	family: ResourceFamily;
	stats: CompleteResourceStatMap;
};

export type TuningAllocation = Record<string, number>;

export type CraftMode = 'safe_craft' | 'careful_experiment';

/** Crafted property output band (Decision 010) — not the same as resource stat bands. */
export type PropertyOutputBand =
	| 'poor'
	| 'basic'
	| 'solid'
	| 'strong'
	| 'excellent'
	| 'exceptional';

export type PropertyPreviewLine = {
	propertyId: string;
	displayName: string;
	baseScore: number;
	tunedScore: number;
	/** Max achievable on this line from resources alone (base × 1.15, cap 100). */
	resourceCeiling: number;
	tunedBand: PropertyOutputBand;
	ceilingBand: PropertyOutputBand;
};

export type CraftPropertyPreview = {
	schematicId: string;
	schematicVersion: number;
	lines: PropertyPreviewLine[];
};

export type CarefulExperimentOutcome = 'boost' | 'unchanged' | 'minor_flaw';

export type ResolvedPropertyLine = PropertyPreviewLine & {
	finalScore: number;
	finalBand: PropertyOutputBand;
};

export type CraftResolution = {
	mode: CraftMode;
	lines: ResolvedPropertyLine[];
	/** Item-level flaw flag — Careful Experiment rolls once per craft (Decision 010). */
	hasMinorFlaw: boolean;
	/** Present for careful_experiment — one outcome applied to every property line. */
	experimentOutcome?: CarefulExperimentOutcome;
};
