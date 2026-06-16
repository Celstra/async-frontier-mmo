import {
	BASIC_DRILL_HEAD,
	EFFICIENT_PUMP,
	FIELD_REPAIR_KIT,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I
} from '../crafting/schematics/index.js';
import { analyzeSchematicReadiness, type OwnedResourceStack } from '../crafting/schematicReadiness.js';
import { THUMPER_CHASSIS_ASSEMBLY } from '../crafting/schematics/thumperChassisAssembly.js';
import type { SchematicDefinition } from '../crafting/types.js';
import type { NamedResourceId } from '../resources/types.js';
import { WORKSHOP_STARTER_GRANT_UNITS, WORKSHOP_BENCH_RESOURCE_IDS } from './benchResources.js';

export type WorkshopStarterGrantLine = {
	resourceSlug: NamedResourceId;
	quantity: number;
};

/** Active thumper-part schematics for Decision 024 workshop-first playtest. */
export const WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS = [
	BASIC_DRILL_HEAD,
	EFFICIENT_PUMP,
	REINFORCED_HULL_PLATE
] as const satisfies readonly SchematicDefinition[];

export const WORKSHOP_ACTIVE_SCHEMATIC_IDS = WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS.map(
	(schematic) => schematic.id
);

/** Hidden from the workshop-first primary workflow (Phase 4 UI). */
export const WORKSHOP_HIDDEN_SCHEMATIC_IDS = [
	SURVEY_SCANNER_MK_I.id,
	FIELD_REPAIR_KIT.id
] as const;

/** Workshop screen stations (thumper = chassis rig assembly). */
export type WorkshopStationId = 'thumper' | 'fabricator';

/**
 * Chassis rig assembly is disabled for Decision 024 — not a craft schematic, but
 * Phase 4 must gate the thumper station using these helpers.
 */
export const WORKSHOP_CHASSIS_ASSEMBLY_ID = THUMPER_CHASSIS_ASSEMBLY.id;

export const WORKSHOP_ENABLED_STATION_IDS = ['fabricator'] as const satisfies readonly WorkshopStationId[];

export function isWorkshopStationEnabled(station: WorkshopStationId): boolean {
	return (WORKSHOP_ENABLED_STATION_IDS as readonly string[]).includes(station);
}

export function isWorkshopChassisAssemblyEnabled(): boolean {
	return false;
}

export function isWorkshopActiveSchematic(schematicId: string): boolean {
	return (WORKSHOP_ACTIVE_SCHEMATIC_IDS as readonly string[]).includes(schematicId);
}

export function isWorkshopHiddenSchematic(schematicId: string): boolean {
	return (WORKSHOP_HIDDEN_SCHEMATIC_IDS as readonly string[]).includes(schematicId);
}

export function buildWorkshopStarterGrant(): WorkshopStarterGrantLine[] {
	return WORKSHOP_BENCH_RESOURCE_IDS.map((resourceSlug) => ({
		resourceSlug,
		quantity: WORKSHOP_STARTER_GRANT_UNITS
	}));
}

/** True when bench stock can fill at least one active thumper-part schematic right now. */
export function canCraftAnyWorkshopThumperPart(ownedStacks: readonly OwnedResourceStack[]): boolean {
	return WORKSHOP_ACTIVE_THUMPER_PART_SCHEMATICS.some((schematic) =>
		analyzeSchematicReadiness({ schematic, ownedStacks }).craftableNow
	);
}
