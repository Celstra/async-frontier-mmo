import type { DepositTopology } from '../survey/depositTopology.js';
import { concentrationAt } from '../survey/depositTopology.js';
import { fieldTileKey } from './fieldDiscovery.js';

export type FieldMapCellChar = '@' | '▲' | '~' | '·' | ' ';

export type FieldMapCell = {
	char: FieldMapCellChar;
	concentrationPercent: number | null;
};

export type FieldMapView = {
	rows: FieldMapCell[][];
	herePercent: number | null;
	bestScannedPercent: number | null;
	rangeHint: string;
	gridWidth: number;
	gridHeight: number;
};

function shadingChar(concentrationPercent: number, minPercent: number, maxPercent: number): '~' | '·' {
	const span = Math.max(1, maxPercent - minPercent);
	const normalized = (concentrationPercent - minPercent) / span;
	return normalized >= 0.45 ? '~' : '·';
}

function isDiscoveredTile(
	key: string,
	x: number,
	y: number,
	input: {
		playerX: number;
		playerY: number;
		discoveredTiles: ReadonlySet<string>;
		waypointTiles: ReadonlySet<string>;
	}
): boolean {
	return (
		input.discoveredTiles.has(key) ||
		input.waypointTiles.has(key) ||
		(x === input.playerX && y === input.playerY)
	);
}

/**
 * Full topology grid in a fixed box — undiscovered tiles are blank;
 * discovery fills in dots; scan adds signal shading.
 */
export function buildFieldMapView(input: {
	topology: DepositTopology;
	playerX: number;
	playerY: number;
	discoveredTiles: ReadonlySet<string>;
	scannedTiles: ReadonlySet<string>;
	waypointTiles: ReadonlySet<string>;
}): FieldMapView {
	const { topology } = input;
	const rows: FieldMapCell[][] = [];
	let bestScannedPercent: number | null = null;

	for (let y = 0; y < topology.height; y += 1) {
		const row: FieldMapCell[] = [];
		for (let x = 0; x < topology.width; x += 1) {
			const key = fieldTileKey(x, y);

			if (!isDiscoveredTile(key, x, y, input)) {
				row.push({ char: ' ', concentrationPercent: null });
				continue;
			}

			const scanned = input.scannedTiles.has(key);
			const concentration = concentrationAt(topology, x, y);

			if (x === input.playerX && y === input.playerY) {
				row.push({
					char: '@',
					concentrationPercent: scanned ? concentration : null
				});
				if (scanned && concentration !== null) {
					bestScannedPercent =
						bestScannedPercent === null
							? concentration
							: Math.max(bestScannedPercent, concentration);
				}
				continue;
			}

			if (input.waypointTiles.has(key)) {
				row.push({
					char: '▲',
					concentrationPercent: scanned ? concentration : null
				});
				if (scanned && concentration !== null) {
					bestScannedPercent =
						bestScannedPercent === null
							? concentration
							: Math.max(bestScannedPercent, concentration);
				}
				continue;
			}

			if (scanned && concentration !== null) {
				row.push({
					char: shadingChar(concentration, topology.concentrationMin, topology.concentrationMax),
					concentrationPercent: concentration
				});
				bestScannedPercent =
					bestScannedPercent === null ? concentration : Math.max(bestScannedPercent, concentration);
				continue;
			}

			row.push({ char: '·', concentrationPercent: null });
		}
		rows.push(row);
	}

	const hereKey = fieldTileKey(input.playerX, input.playerY);
	const herePercent =
		input.scannedTiles.has(hereKey) &&
		concentrationAt(topology, input.playerX, input.playerY) !== null
			? concentrationAt(topology, input.playerX, input.playerY)
			: null;

	return {
		rows,
		herePercent,
		bestScannedPercent,
		rangeHint: `${topology.concentrationMin}–${topology.concentrationMax}%`,
		gridWidth: topology.width,
		gridHeight: topology.height
	};
}
