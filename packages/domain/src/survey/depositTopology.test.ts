import { describe, expect, it } from 'vitest';
import {
	concentrationAt,
	getTopology,
	PLAYER_SPAWN_X,
	PLAYER_SPAWN_Y,
	resolveDepositSpot,
	spotIdFor
} from './depositTopology.js';

describe('depositTopology', () => {
	const range = { minPercent: 30, maxPercent: 67 };
	const instanceId = 'ri_test_topology_001';

	it('is deterministic for the same resource instance', () => {
		const first = getTopology(instanceId, range);
		const second = getTopology(instanceId, range);
		expect(second).toEqual(first);
	});

	it('guarantees an adjacent tile lands in the bottom third of the rolled range on first scan', () => {
		const topology = getTopology(instanceId, range);
		const lowCeiling = range.minPercent + (range.maxPercent - range.minPercent) / 3;

		const neighbors = [
			{ x: PLAYER_SPAWN_X - 1, y: PLAYER_SPAWN_Y },
			{ x: PLAYER_SPAWN_X + 1, y: PLAYER_SPAWN_Y },
			{ x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y - 1 },
			{ x: PLAYER_SPAWN_X, y: PLAYER_SPAWN_Y + 1 }
		];

		const adjacentValues = neighbors
			.map(({ x, y }) => concentrationAt(topology, x, y))
			.filter((value): value is number => value !== null);

		expect(adjacentValues.some((value) => value <= lowCeiling + 0.5)).toBe(true);
	});

	it('formats stable spot ids from tile coordinates', () => {
		expect(spotIdFor(instanceId, 4, 9)).toBe(`${instanceId}@4,9`);
	});

	it('resolveDepositSpot accepts FIELD topology spot ids', () => {
		const spotId = spotIdFor(instanceId, PLAYER_SPAWN_X, PLAYER_SPAWN_Y);
		const spot = resolveDepositSpot({
			spotId,
			resourceInstanceId: instanceId,
			resourceSlug: 'veyrith_copper',
			bloomGenerationSeed: 'bloom-seed',
			concentrationMinPercent: range.minPercent,
			concentrationMaxPercent: range.maxPercent,
			prospectingCycle: 1
		});

		expect(spot?.spotId).toBe(spotId);
		expect(spot?.resourceSlug).toBe('veyrith_copper');
	});
});
