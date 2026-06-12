export type CraftEquipTarget =
	| { kind: 'scanner'; action: '?/equipScanner' }
	| { kind: 'thumper_part'; action: '?/equipThumperPart'; slot: 'drill' | 'pump' | 'hull' }
	| { kind: 'none' };

export function equipTargetForSchematic(schematicId: string): CraftEquipTarget {
	switch (schematicId) {
		case 'survey_scanner_mk_i':
			return { kind: 'scanner', action: '?/equipScanner' };
		case 'basic_drill_head':
			return { kind: 'thumper_part', action: '?/equipThumperPart', slot: 'drill' };
		case 'efficient_pump':
			return { kind: 'thumper_part', action: '?/equipThumperPart', slot: 'pump' };
		case 'reinforced_hull_plate':
			return { kind: 'thumper_part', action: '?/equipThumperPart', slot: 'hull' };
		default:
			return { kind: 'none' };
	}
}
