import {
	BLOOM_ONE_ID,
	createDb,
	fastForwardOpenThumperRunToClaimable,
	getBloomRecord,
	getResourceInstanceByBloomSlug,
	resetKethIronDepositSpotsForSmoke as resetKethIronDepositSpots
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

/** Shared bloom spots drain across pilots — reset Keth before each path run. */
export async function resetKethIronDepositSpotsForSmoke(): Promise<void> {
	const db = createDb(requireDatabaseUrl());
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
	const db = createDb(requireDatabaseUrl());
	await fastForwardOpenThumperRunToClaimable(db, pilotId);
}
