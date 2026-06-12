import { BASIC_DRILL_HEAD } from './basicDrillHead.js';
import { EFFICIENT_PUMP } from './efficientPump.js';
import { FIELD_REPAIR_KIT } from './fieldRepairKit.js';
import { REINFORCED_HULL_PLATE } from './reinforcedHullPlate.js';
import { SURVEY_SCANNER_MK_I } from './surveyScannerMkI.js';
import type { SchematicDefinition } from '../types.js';

/** Locked MVP thumper-part schematics (Decision 003 / 015). */
export const MVP_THUMPER_PART_SCHEMATICS = [
	BASIC_DRILL_HEAD,
	EFFICIENT_PUMP,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I
] as const satisfies readonly SchematicDefinition[];

/** All five MVP craft outputs including Field Repair Kit (Lesson 6.2). */
export const MVP_CRAFT_SCHEMATICS = [
	...MVP_THUMPER_PART_SCHEMATICS,
	FIELD_REPAIR_KIT
] as const satisfies readonly SchematicDefinition[];

export const MVP_SCHEMATIC_BY_ID: Record<string, SchematicDefinition> = Object.fromEntries(
	MVP_CRAFT_SCHEMATICS.map((schematic) => [schematic.id, schematic])
);

export { BASIC_DRILL_HEAD } from './basicDrillHead.js';
export { EFFICIENT_PUMP } from './efficientPump.js';
export { FIELD_REPAIR_KIT, FIRST_REPAIR_KIT_SUGGESTED_TUNING } from './fieldRepairKit.js';
export { REINFORCED_HULL_PLATE } from './reinforcedHullPlate.js';
export { FIRST_SCANNER_SUGGESTED_TUNING, SURVEY_SCANNER_MK_I } from './surveyScannerMkI.js';
