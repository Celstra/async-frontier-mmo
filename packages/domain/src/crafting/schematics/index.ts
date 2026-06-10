import { BASIC_DRILL_HEAD } from './basicDrillHead.js';
import { EFFICIENT_PUMP } from './efficientPump.js';
import { REINFORCED_HULL_PLATE } from './reinforcedHullPlate.js';
import { SURVEY_SCANNER_MK_I } from './surveyScannerMkI.js';
import type { SchematicDefinition } from '../types.js';

/** Locked MVP craft schematics (Decision 003 / 015) — Field Repair Kit added in Lesson 6.2. */
export const MVP_THUMPER_PART_SCHEMATICS = [
	BASIC_DRILL_HEAD,
	EFFICIENT_PUMP,
	REINFORCED_HULL_PLATE,
	SURVEY_SCANNER_MK_I
] as const satisfies readonly SchematicDefinition[];

export const MVP_SCHEMATIC_BY_ID: Record<string, SchematicDefinition> = Object.fromEntries(
	MVP_THUMPER_PART_SCHEMATICS.map((schematic) => [schematic.id, schematic])
);

export { BASIC_DRILL_HEAD, EFFICIENT_PUMP, REINFORCED_HULL_PLATE, SURVEY_SCANNER_MK_I };
