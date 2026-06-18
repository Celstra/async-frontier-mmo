/** Pixel-art paths for workshop schematic assembly UI. */

export type AssemblySlotPlacement = 'top' | 'left' | 'right';

/** Outer edge for the "Next" badge — opposite the connector side that faces the part. */
export type AssemblyNextBadgeEdge = 'top' | 'left' | 'right';

export type AssemblySlotLayout = {
	/** Normalized 0–1 center on the part artwork. */
	anchor: { x: number; y: number };
	/** Highlight ring radius as a fraction of rendered part width. */
	radius: number;
	placement: AssemblySlotPlacement;
};

export const SCHEMATIC_PART_IMAGES: Record<string, string> = {
	efficient_pump: '/images/workshop/efficient-pump.png?v=2',
	basic_drill_head: '/images/workshop/basic-drill-head.png?v=2',
	reinforced_hull_plate: '/images/workshop/reinforced-hull-plate.png?v=2'
};

export const FAMILY_CONTAINER_IMAGES: Record<string, string> = {
	structural_alloy: '/images/workshop/container-structural-alloy.png?v=2',
	conductive_metal: '/images/workshop/container-conductive-metal.png?v=2',
	reactive_crystal: '/images/workshop/container-reactive-crystal.png?v=2'
};

/** Per-slot anchor on artwork + sidebar placement for connector lines. */
export const ASSEMBLY_SLOT_LAYOUTS: Record<string, Record<string, AssemblySlotLayout>> = {
	efficient_pump: {
		intake_manifold: { anchor: { x: 0.5, y: 0.14 }, radius: 0.13, placement: 'top' },
		flexible_housing: { anchor: { x: 0.34, y: 0.54 }, radius: 0.15, placement: 'left' },
		flow_crystal: { anchor: { x: 0.7, y: 0.66 }, radius: 0.11, placement: 'right' }
	},
	basic_drill_head: {
		cutting_bit: { anchor: { x: 0.1, y: 0.48 }, radius: 0.1, placement: 'left' },
		conductive_coil: { anchor: { x: 0.5, y: 0.24 }, radius: 0.12, placement: 'top' },
		resonance_crystal: { anchor: { x: 0.78, y: 0.38 }, radius: 0.1, placement: 'right' }
	},
	reinforced_hull_plate: {
		outer_plate: { anchor: { x: 0.5, y: 0.22 }, radius: 0.17, placement: 'top' },
		bracing_layer: { anchor: { x: 0.28, y: 0.52 }, radius: 0.14, placement: 'left' },
		bonding_matrix: { anchor: { x: 0.72, y: 0.54 }, radius: 0.12, placement: 'right' }
	}
};

const DEFAULT_PLACEMENTS: AssemblySlotPlacement[] = ['top', 'left', 'right'];

export function assemblySlotLayout(
	schematicId: string,
	slotId: string,
	fallbackIndex: number
): AssemblySlotLayout {
	return (
		ASSEMBLY_SLOT_LAYOUTS[schematicId]?.[slotId] ?? {
			anchor: { x: 0.5, y: 0.5 },
			radius: 0.12,
			placement: DEFAULT_PLACEMENTS[fallbackIndex] ?? 'top'
		}
	);
}

export function assemblySlotPlacementLabel(placement: AssemblySlotPlacement): string {
	switch (placement) {
		case 'top':
			return 'top socket on the assembly diagram';
		case 'left':
			return 'left socket on the assembly diagram';
		case 'right':
			return 'right socket on the assembly diagram';
	}
}

/** Place the Next badge on the outer edge so it does not cover the wire to the part. */
export function assemblyNextBadgeEdge(placement: AssemblySlotPlacement): AssemblyNextBadgeEdge {
	switch (placement) {
		case 'top':
			return 'top';
		case 'left':
			return 'left';
		case 'right':
			return 'right';
	}
}

export function schematicPartImage(schematicId: string): string | null {
	return SCHEMATIC_PART_IMAGES[schematicId] ?? null;
}

export function familyContainerImage(familyId: string): string | null {
	return FAMILY_CONTAINER_IMAGES[familyId] ?? null;
}
