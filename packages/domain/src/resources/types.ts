import type { ResourceStatCode } from 'shared';

/** Locked MVP resource families (Decision 006). */
export type ResourceFamily =
	| 'conductive_metal'
	| 'structural_alloy'
	| 'reactive_crystal';

/** All five MVP stats required — not Partial. */
export type CompleteResourceStatMap = Record<ResourceStatCode, number>;

export type NamedResourceId =
	| 'keth_iron'
	| 'red_mesa_conductive_slag'
	| 'asterion_frame_alloy'
	| 'pale_ember_crystal'
	| 'veyrith_copper'
	| 'thornwake_crystal';

export type NamedResourceDefinition = {
	id: NamedResourceId;
	displayName: string;
	family: ResourceFamily;
	stats: CompleteResourceStatMap;
};
