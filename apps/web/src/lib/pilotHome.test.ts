import { describe, expect, it } from 'vitest';
import { ENERGY_REGEN_SAMPLES_PER_HOUR, SURVEY_ENERGY_CAP } from '@async-frontier-mmo/domain';
import { buildHubTiles } from './pilotHome.js';

const baseInput = {
	needsFrameChoice: false,
	openRun: null,
	thumperDemo: null,
	runReadyToResolve: false,
	equippedThumperParts: { drill: null, pump: null, hull: null },
	overallThumperCondition: null,
	surveyEnergy: SURVEY_ENERGY_CAP,
	surveyEnergyCap: SURVEY_ENERGY_CAP,
	surveyEnergyOutlook: {
		regenSamplesPerHour: ENERGY_REGEN_SAMPLES_PER_HOUR,
		hoursUntilFull: 0,
		canScanNow: true,
		canSampleNow: true,
		hoursUntilNextScan: 0,
		hoursUntilNextSample: 0
	},
	sampledSpotCount: 0,
	hasFamilyScan: false,
	workbenchSummaries: [
		{
			schematicId: 'survey_scanner_mk_i',
			displayName: 'Survey Scanner Module Mk I',
			craftableNow: false,
			firstBlocker: 'Conductive Core needs 30 Conductive Metal — you have none.'
		}
	],
	familyCounts: {
		conductive_metal: 0,
		structural_alloy: 35,
		reactive_crystal: 35
	},
	repairKitCount: 0
};

describe('buildHubTiles', () => {
	it('returns four ordered hub tiles with stable ids', () => {
		const tiles = buildHubTiles(baseInput);
		expect(tiles.map((tile) => tile.id)).toEqual(['thumper', 'survey', 'workbench', 'storage']);
	});

	it('routes an active thumper run to /run', () => {
		const tiles = buildHubTiles({
			...baseInput,
			openRun: { targetDisplayName: 'Veyrith Copper', recalled: false },
			thumperDemo: { status: 'active', secondsRemaining: 240 }
		});
		const thumper = tiles.find((tile) => tile.id === 'thumper');
		expect(thumper?.id === 'thumper' && thumper.state).toBe('active');
		if (thumper?.id === 'thumper') {
			expect(thumper.href).toBe('/run');
			expect(thumper.secondsRemaining).toBe(240);
		}
	});

	it('routes a claimable run to /claim', () => {
		const tiles = buildHubTiles({
			...baseInput,
			openRun: { targetDisplayName: 'Veyrith Copper', recalled: false },
			thumperDemo: { status: 'claimable', secondsRemaining: 0 },
			runReadyToResolve: true
		});
		const thumper = tiles.find((tile) => tile.id === 'thumper');
		if (thumper?.id === 'thumper') {
			expect(thumper.state).toBe('ready_to_claim');
			expect(thumper.href).toBe('/claim');
		}
	});
});
