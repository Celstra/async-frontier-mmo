import { describe, expect, it } from 'vitest';
import { buildFieldMapView } from './buildFieldMapView.js';
import { discoveryPatchAround, fieldTileKey } from './fieldDiscovery.js';
import { getTopology, PLAYER_SPAWN_X, PLAYER_SPAWN_Y } from '../survey/depositTopology.js';

describe('buildFieldMapView', () => {
	it('always renders the full topology grid', () => {
		const topology = getTopology('full-grid', { minPercent: 20, maxPercent: 90 });
		const discovered = new Set(
			discoveryPatchAround(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, topology.width, topology.height)
		);
		const view = buildFieldMapView({
			topology,
			playerX: PLAYER_SPAWN_X,
			playerY: PLAYER_SPAWN_Y,
			discoveredTiles: discovered,
			scannedTiles: new Set(),
			waypointTiles: new Set()
		});

		expect(view.rows.length).toBe(topology.height);
		expect(view.rows[0]!.length).toBe(topology.width);
	});

	it('leaves undiscovered tiles blank in the fixed grid', () => {
		const topology = getTopology('fog-test', { minPercent: 20, maxPercent: 90 });
		const discovered = new Set(
			discoveryPatchAround(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, topology.width, topology.height)
		);
		const view = buildFieldMapView({
			topology,
			playerX: PLAYER_SPAWN_X,
			playerY: PLAYER_SPAWN_Y,
			discoveredTiles: discovered,
			scannedTiles: new Set(),
			waypointTiles: new Set()
		});

		expect(view.rows[0]![0]!.char).toBe(' ');
	});

	it('reveals dots as tiles are discovered', () => {
		const topology = getTopology('discover-test', { minPercent: 20, maxPercent: 90 });
		const spawnKey = fieldTileKey(PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
		const discovered = new Set(
			discoveryPatchAround(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, topology.width, topology.height)
		);
		const view = buildFieldMapView({
			topology,
			playerX: PLAYER_SPAWN_X,
			playerY: PLAYER_SPAWN_Y,
			discoveredTiles: discovered,
			scannedTiles: new Set([spawnKey]),
			waypointTiles: new Set()
		});

		expect(view.rows[PLAYER_SPAWN_Y]![PLAYER_SPAWN_X]!.char).toBe('@');
		expect(view.herePercent).not.toBeNull();
	});

	it('marks sampled tiles as waypoints', () => {
		const topology = getTopology('waypoint-instance', { minPercent: 30, maxPercent: 80 });
		const discovered = new Set(
			discoveryPatchAround(PLAYER_SPAWN_X, PLAYER_SPAWN_Y, topology.width, topology.height, 2)
		);
		discovered.add('4,3');
		const view = buildFieldMapView({
			topology,
			playerX: PLAYER_SPAWN_X,
			playerY: PLAYER_SPAWN_Y,
			discoveredTiles: discovered,
			scannedTiles: new Set(),
			waypointTiles: new Set(['4,3'])
		});

		expect(view.rows[3]![4]!.char).toBe('▲');
	});
});
