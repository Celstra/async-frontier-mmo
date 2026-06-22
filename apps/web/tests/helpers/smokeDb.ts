import {
	BLOOM_ONE_ID,
	cleanupCommandQueuePilotForSmoke as cleanupCommandQueuePilot,
	cleanupScannerCraftPilotForSmoke as cleanupScannerCraftPilot,
	cleanupWorkshopCraftPilotForSmoke as cleanupWorkshopCraftPilot,
	countPlaytestEventsByName,
	createDb,
	fastForwardOpenThumperRunToClaimable,
	getBloomRecord,
	getResourceInstanceByBloomSlug,
	getWorkshopBenchInstanceBySlug,
	mintWorkshopTimerCrateForSmoke as mintWorkshopTimerCrate,
	resetKethIronDepositSpotsForSmoke as resetKethIronDepositSpots,
	seedCommandQueuePilotForSmoke as seedCommandQueuePilot,
	seedScannerCraftPilotForSmoke as seedScannerCraftPilot,
	seedWorkshopCraftPilotForSmoke as seedWorkshopCraftPilot
} from '@async-frontier-mmo/db';
import { TUTORIAL_DEPLOY_RESOURCE_SLUG } from '@async-frontier-mmo/domain';

function requireDatabaseUrl(): string {
	const url = process.env.DATABASE_URL;
	if (!url) {
		throw new Error(
			'DATABASE_URL is required for browser path smoke (set packages/db/.env or export DATABASE_URL)'
		);
	}
	return url;
}

function smokeDb() {
	return createDb(requireDatabaseUrl());
}

/** Shared bloom spots drain across pilots — reset Keth before each path run. */
export async function resetKethIronDepositSpotsForSmoke(): Promise<void> {
	const db = smokeDb();
	const bloom = await getBloomRecord(db, BLOOM_ONE_ID);
	const generationSeed = bloom?.generationSeed ?? `red-mesa-bloom-${BLOOM_ONE_ID}`;
	const instance = await getResourceInstanceByBloomSlug(
		db,
		BLOOM_ONE_ID,
		TUTORIAL_DEPLOY_RESOURCE_SLUG
	);
	if (!instance) {
		throw new Error('Keth Iron resource instance missing for smoke reset');
	}

	await resetKethIronDepositSpots(db, {
		resourceInstanceId: instance.id,
		generationSeed,
		resourceSlug: TUTORIAL_DEPLOY_RESOURCE_SLUG,
		prospectingCycle: instance.prospectingCycle,
		concentrationMinPercent: instance.concentrationMinPercent,
		concentrationMaxPercent: instance.concentrationMaxPercent
	});
}

export async function fastForwardOpenRunToClaimable(pilotId: string): Promise<void> {
	const db = smokeDb();
	await fastForwardOpenThumperRunToClaimable(db, pilotId);
}

export async function seedScannerCraftPilotForSmoke(pilotId: string): Promise<void> {
	await seedScannerCraftPilot(smokeDb(), pilotId);
}

export async function cleanupScannerCraftPilotForSmoke(pilotId: string): Promise<void> {
	await cleanupScannerCraftPilot(smokeDb(), pilotId);
}

export async function seedCommandQueuePilotForSmoke(
	pilotId: string,
	options?: { commandQueueLength?: 2 | 3 }
): Promise<void> {
	await seedCommandQueuePilot(smokeDb(), pilotId, options);
}

export async function cleanupCommandQueuePilotForSmoke(pilotId: string): Promise<void> {
	await cleanupCommandQueuePilot(smokeDb(), pilotId);
}

export async function seedWorkshopCraftPilotForSmoke(pilotId: string): Promise<void> {
	await seedWorkshopCraftPilot(smokeDb(), pilotId);
}

export async function cleanupWorkshopCraftPilotForSmoke(pilotId: string): Promise<void> {
	await cleanupWorkshopCraftPilot(smokeDb(), pilotId);
}

export async function mintWorkshopTimerCrateForSmoke(pilotId: string): Promise<void> {
	await mintWorkshopTimerCrate(smokeDb(), pilotId);
}

export async function countPilotPlaytestEvents(
	pilotId: string,
	eventName: Parameters<typeof countPlaytestEventsByName>[2]
): Promise<number> {
	return countPlaytestEventsByName(smokeDb(), pilotId, eventName);
}

export async function getWorkshopBenchSlotInstanceIdsForSmoke(): Promise<{
	kethIron: string;
	veyrithCopper: string;
	sorrelCopper: string;
	paleCrystal: string;
	asterionAlloy: string;
}> {
	const db = smokeDb();
	const [kethIron, veyrithCopper, sorrelCopper, paleCrystal, asterionAlloy] = await Promise.all([
		getWorkshopBenchInstanceBySlug(db, 'keth_iron'),
		getWorkshopBenchInstanceBySlug(db, 'veyrith_copper'),
		getWorkshopBenchInstanceBySlug(db, 'sorrel_vein_copper'),
		getWorkshopBenchInstanceBySlug(db, 'pale_ember_crystal'),
		getWorkshopBenchInstanceBySlug(db, 'asterion_frame_alloy')
	]);

	return {
		kethIron: kethIron.id,
		veyrithCopper: veyrithCopper.id,
		sorrelCopper: sorrelCopper.id,
		paleCrystal: paleCrystal.id,
		asterionAlloy: asterionAlloy.id
	};
}
