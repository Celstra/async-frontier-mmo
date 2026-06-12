import { createSeededRng } from '../rng.js';

export const TOPOLOGY_GRID_WIDTH = 16;
export const TOPOLOGY_GRID_HEIGHT = 11;
export const PLAYER_SPAWN_X = 8;
export const PLAYER_SPAWN_Y = 5;

export type ConcentrationRange = {
	minPercent: number;
	maxPercent: number;
};

export type DepositTopology = {
	instanceId: string;
	width: number;
	height: number;
	spawnX: number;
	spawnY: number;
	concentrationMin: number;
	concentrationMax: number;
	grid: number[][];
};

type Peak = {
	x: number;
	y: number;
	height: number;
};

function rollInt(rng: () => number, min: number, max: number): number {
	return min + Math.floor(rng() * (max - min + 1));
}

function isAdjacentToSpawn(x: number, y: number): boolean {
	const dx = Math.abs(x - PLAYER_SPAWN_X);
	const dy = Math.abs(y - PLAYER_SPAWN_Y);
	return (dx === 1 && dy === 0) || (dx === 0 && dy === 1);
}

function bottomThirdUpperBound(range: ConcentrationRange): number {
	return range.minPercent + (range.maxPercent - range.minPercent) / 3;
}

function peakContribution(
	distance: number,
	peakHeight: number,
	falloffRadius: number
): number {
	if (distance >= falloffRadius) {
		return 0;
	}
	const t = 1 - distance / falloffRadius;
	return peakHeight * t * t;
}

function buildGridFromPeaks(
	width: number,
	height: number,
	peaks: Peak[],
	range: ConcentrationRange
): number[][] {
	const falloffRadius = Math.max(width, height) * 0.45;
	const grid: number[][] = [];

	for (let y = 0; y < height; y += 1) {
		const row: number[] = [];
		for (let x = 0; x < width; x += 1) {
			let value = range.minPercent;
			for (const peak of peaks) {
				const distance = Math.hypot(x - peak.x, y - peak.y);
				value = Math.max(value, range.minPercent + peakContribution(distance, peak.height, falloffRadius));
			}
			row.push(
				Math.round(Math.min(range.maxPercent, Math.max(range.minPercent, value)))
			);
		}
		grid.push(row);
	}

	return grid;
}

function enforceLowFirstScanAdjacent(grid: number[][], range: ConcentrationRange): void {
	const lowCeiling = Math.round(bottomThirdUpperBound(range));
	const adjacent: Array<{ x: number; y: number }> = [];

	for (let y = 0; y < TOPOLOGY_GRID_HEIGHT; y += 1) {
		for (let x = 0; x < TOPOLOGY_GRID_WIDTH; x += 1) {
			if (isAdjacentToSpawn(x, y)) {
				adjacent.push({ x, y });
			}
		}
	}

	const alreadyLow = adjacent.some(({ x, y }) => grid[y]![x]! <= lowCeiling);
	if (alreadyLow) {
		return;
	}

	const target = adjacent[0]!;
	grid[target.y]![target.x] = lowCeiling;
}

function generatePeaks(rng: () => number, range: ConcentrationRange): Peak[] {
	const peakCount = rollInt(rng, 1, 3);
	const span = range.maxPercent - range.minPercent;
	const peaks: Peak[] = [];

	for (let index = 0; index < peakCount; index += 1) {
		let x = rollInt(rng, 0, TOPOLOGY_GRID_WIDTH - 1);
		let y = rollInt(rng, 0, TOPOLOGY_GRID_HEIGHT - 1);
		if (x === PLAYER_SPAWN_X && y === PLAYER_SPAWN_Y) {
			x = (x + 1) % TOPOLOGY_GRID_WIDTH;
		}

		const peakMax = rollInt(rng, range.minPercent + Math.round(span * 0.55), range.maxPercent);
		peaks.push({
			x,
			y,
			height: peakMax - range.minPercent
		});
	}

	return peaks;
}

const topologyCache = new Map<string, DepositTopology>();

/**
 * Per-resource-instance concentration field — deterministic from instance id.
 */
export function getTopology(
	instanceId: string,
	concentrationRange: ConcentrationRange
): DepositTopology {
	const cacheKey = `${instanceId}:${concentrationRange.minPercent}-${concentrationRange.maxPercent}`;
	const cached = topologyCache.get(cacheKey);
	if (cached) {
		return cached;
	}

	const rng = createSeededRng(`topology:${instanceId}`);
	const peaks = generatePeaks(rng, concentrationRange);
	const grid = buildGridFromPeaks(
		TOPOLOGY_GRID_WIDTH,
		TOPOLOGY_GRID_HEIGHT,
		peaks,
		concentrationRange
	);
	enforceLowFirstScanAdjacent(grid, concentrationRange);

	const topology: DepositTopology = {
		instanceId,
		width: TOPOLOGY_GRID_WIDTH,
		height: TOPOLOGY_GRID_HEIGHT,
		spawnX: PLAYER_SPAWN_X,
		spawnY: PLAYER_SPAWN_Y,
		concentrationMin: concentrationRange.minPercent,
		concentrationMax: concentrationRange.maxPercent,
		grid
	};

	topologyCache.set(cacheKey, topology);
	return topology;
}

export function concentrationAt(topology: DepositTopology, x: number, y: number): number | null {
	if (x < 0 || y < 0 || x >= topology.width || y >= topology.height) {
		return null;
	}
	return topology.grid[y]![x]!;
}

export function spotIdFor(instanceId: string, x: number, y: number): string {
	return `${instanceId}@${x},${y}`;
}
