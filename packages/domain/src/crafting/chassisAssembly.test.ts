import { describe, expect, it } from 'vitest';
import {
	analyzeChassisAssemblyReadiness,
	validateChassisAssembly,
	type OwnedThumperPart
} from './chassisAssembly.js';

const wornParts: OwnedThumperPart[] = [
	{
		itemId: 'hull-1',
		schematicId: 'worn_basic_hull',
		displayName: 'Scavenged Hull',
		slot: 'hull',
		condition: 55,
		integrity: 5
	},
	{
		itemId: 'drill-1',
		schematicId: 'worn_basic_drill',
		displayName: 'Worn Basic Drill',
		slot: 'drill',
		condition: 55,
		integrity: 70
	},
	{
		itemId: 'pump-1',
		schematicId: 'worn_basic_pump',
		displayName: 'Worn Basic Pump',
		slot: 'pump',
		condition: 55,
		integrity: 70
	}
];

describe('chassisAssembly', () => {
	it('reports assemblable when one part exists per socket', () => {
		const readiness = analyzeChassisAssemblyReadiness({ ownedParts: wornParts });
		expect(readiness.assemblableNow).toBe(true);
		expect(readiness.blockers).toHaveLength(0);
	});

	it('rejects duplicate part across sockets', () => {
		const outcome = validateChassisAssembly({
			selections: { hull: 'hull-1', drill: 'hull-1', pump: 'pump-1' },
			ownedParts: wornParts
		});
		expect(outcome.valid).toBe(false);
		if (!outcome.valid) {
			expect(outcome.reason).toContain('different part');
		}
	});

	it('accepts a full valid selection', () => {
		const outcome = validateChassisAssembly({
			selections: { hull: 'hull-1', drill: 'drill-1', pump: 'pump-1' },
			ownedParts: wornParts
		});
		expect(outcome.valid).toBe(true);
	});
});
