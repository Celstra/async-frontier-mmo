export function fieldTileKey(x: number, y: number): string {
	return `${x},${y}`;
}

export function parseFieldTileKey(key: string): { x: number; y: number } | null {
	const match = key.match(/^(\d+),(\d+)$/);
	if (!match) {
		return null;
	}
	return { x: Number.parseInt(match[1]!, 10), y: Number.parseInt(match[2]!, 10) };
}

/** Tiles revealed around a position — used on spawn and each move. */
export function discoveryPatchAround(
	x: number,
	y: number,
	gridWidth: number,
	gridHeight: number,
	radius = 1
): string[] {
	const keys: string[] = [];
	for (let dy = -radius; dy <= radius; dy += 1) {
		for (let dx = -radius; dx <= radius; dx += 1) {
			const tx = x + dx;
			const ty = y + dy;
			if (tx >= 0 && ty >= 0 && tx < gridWidth && ty < gridHeight) {
				keys.push(fieldTileKey(tx, ty));
			}
		}
	}
	return keys;
}

export function mergeDiscoveredTiles(
	existing: readonly string[],
	additions: readonly string[]
): string[] {
	const merged = new Set(existing);
	for (const key of additions) {
		merged.add(key);
	}
	return [...merged];
}

export type FieldViewportBounds = {
	minX: number;
	maxX: number;
	minY: number;
	maxY: number;
};

/** Viewport grows with exploration — padding keeps one tile of frontier visible. */
export function fieldViewportBounds(input: {
	discoveredTiles: ReadonlySet<string>;
	playerX: number;
	playerY: number;
	waypointTiles: ReadonlySet<string>;
	gridWidth: number;
	gridHeight: number;
	padding?: number;
}): FieldViewportBounds {
	const padding = input.padding ?? 1;
	const points: Array<{ x: number; y: number }> = [{ x: input.playerX, y: input.playerY }];

	for (const key of input.discoveredTiles) {
		const parsed = parseFieldTileKey(key);
		if (parsed) {
			points.push(parsed);
		}
	}
	for (const key of input.waypointTiles) {
		const parsed = parseFieldTileKey(key);
		if (parsed) {
			points.push(parsed);
		}
	}

	if (points.length === 0) {
		return {
			minX: Math.max(0, input.playerX - padding),
			maxX: Math.min(input.gridWidth - 1, input.playerX + padding),
			minY: Math.max(0, input.playerY - padding),
			maxY: Math.min(input.gridHeight - 1, input.playerY + padding)
		};
	}

	let minX = input.gridWidth;
	let minY = input.gridHeight;
	let maxX = 0;
	let maxY = 0;

	for (const point of points) {
		minX = Math.min(minX, point.x);
		maxX = Math.max(maxX, point.x);
		minY = Math.min(minY, point.y);
		maxY = Math.max(maxY, point.y);
	}

	return {
		minX: Math.max(0, minX - padding),
		maxX: Math.min(input.gridWidth - 1, maxX + padding),
		minY: Math.max(0, minY - padding),
		maxY: Math.min(input.gridHeight - 1, maxY + padding)
	};
}

export function isTileInViewport(
	x: number,
	y: number,
	bounds: FieldViewportBounds
): boolean {
	return x >= bounds.minX && x <= bounds.maxX && y >= bounds.minY && y <= bounds.maxY;
}
