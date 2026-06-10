import {
	applyProspectingScannerWear,
	buildFamilyScanPreview,
	createEmptyPilotSurveyProgress,
	findDepositSpot,
	generateDepositSpots,
	isDeemphasizedSurveyStat,
	resolveSurveyEnergy,
	SAMPLE_ENERGY_COST,
	SURVEY_ENERGY_CAP,
	sampleDepositSpot,
	scanFamilyProspect,
	type DepositSpot,
	type FamilyScanResourceView,
	type PilotSurveyProgress,
	type ResourceFamily
} from '@async-frontier-mmo/domain';
import { and, eq } from 'drizzle-orm';
import type { Db, DbExecutor } from '../client.js';
import { loadDepositSpotYieldMap, yieldPresentationMap } from './depositSpotYields.js';
import { pilotDepositSpotSamples } from '../schema/pilotDepositSpotSamples.js';
import { pilotFamilyScans } from '../schema/pilotFamilyScans.js';
import { pilotResourceStatReveals } from '../schema/pilotResourceStatReveals.js';
import { pilotSurveyEnergy } from '../schema/pilotSurveyEnergy.js';
import { items } from '../schema/items.js';
import { resourceInstances } from '../schema/resourceInstances.js';
import { appendEconomyLedgerEntry, appendItemConditionChangedLedger } from './economyLedger.js';
import { getBloomRecord } from './bloomRotation.js';
import { getEquippedScannerForPilot } from './scannerEquipment.js';
import { grantResourceToPilotTx } from './resourceGrants.js';
import {
	getActiveBloomId,
	getResourceInstanceById,
	listResourceInstancesForBloom,
	resourceInstanceToSurveyResource
} from './resourceInstances.js';

export type PilotProspectingProgress = {
	surveyEnergy: number;
	lastEnergyUpdatedAtMs: number;
	revealedResourceSlugs: string[];
	sampledSpotIds: string[];
};

async function getBloomGenerationSeed(db: DbExecutor, bloomId: number): Promise<string> {
	const bloom = await getBloomRecord(db, bloomId);
	return bloom?.generationSeed ?? `red-mesa-bloom-${bloomId}`;
}

async function ensurePilotSurveyEnergyRow(db: DbExecutor, pilotId: string, now: Date) {
	const [existing] = await db
		.select()
		.from(pilotSurveyEnergy)
		.where(eq(pilotSurveyEnergy.pilotId, pilotId))
		.limit(1);

	if (existing) {
		return existing;
	}

	const [created] = await db
		.insert(pilotSurveyEnergy)
		.values({
			pilotId,
			surveyEnergy: SURVEY_ENERGY_CAP,
			lastUpdatedAt: now
		})
		.onConflictDoNothing()
		.returning();

	if (created) {
		return created;
	}

	const [loaded] = await db
		.select()
		.from(pilotSurveyEnergy)
		.where(eq(pilotSurveyEnergy.pilotId, pilotId))
		.limit(1);

	if (!loaded) {
		throw new Error(`Failed to ensure survey energy row for pilot ${pilotId}`);
	}

	return loaded;
}

async function loadPilotSurveyProgress(
	db: DbExecutor,
	pilotId: string,
	nowMs: number,
	bloomId?: number
): Promise<PilotSurveyProgress> {
	const now = new Date(nowMs);
	const energyRow = await ensurePilotSurveyEnergyRow(db, pilotId, now);
	const resolved = resolveSurveyEnergy({
		storedEnergy: energyRow.surveyEnergy,
		lastUpdatedAtMs: energyRow.lastUpdatedAt.getTime(),
		nowMs
	});

	const bloomScoped = bloomId !== undefined;

	const revealRows = await db
		.select({ resourceSlug: resourceInstances.resourceSlug })
		.from(pilotResourceStatReveals)
		.innerJoin(
			resourceInstances,
			eq(pilotResourceStatReveals.resourceInstanceId, resourceInstances.id)
		)
		.where(
			bloomScoped
				? and(
						eq(pilotResourceStatReveals.pilotId, pilotId),
						eq(resourceInstances.bloomId, bloomId)
					)
				: eq(pilotResourceStatReveals.pilotId, pilotId)
		);

	const sampleRows = await db
		.select({ spotId: pilotDepositSpotSamples.spotId })
		.from(pilotDepositSpotSamples)
		.innerJoin(
			resourceInstances,
			eq(pilotDepositSpotSamples.resourceInstanceId, resourceInstances.id)
		)
		.where(
			bloomScoped
				? and(eq(pilotDepositSpotSamples.pilotId, pilotId), eq(resourceInstances.bloomId, bloomId))
				: eq(pilotDepositSpotSamples.pilotId, pilotId)
		);

	const revealedResourceSlugs = new Set(revealRows.map((row) => row.resourceSlug));

	return {
		revealedResourceSlugs,
		sampledSpotIds: new Set(sampleRows.map((row) => row.spotId)),
		surveyEnergy: resolved.energy,
		lastEnergyUpdatedAtMs: resolved.lastUpdatedAtMs
	};
}

async function persistSurveyEnergySpend(
	db: DbExecutor,
	input: {
		pilotId: string;
		expectedStoredEnergy: number;
		expectedLastUpdatedAt: Date;
		nextEnergy: number;
		nextLastUpdatedAtMs: number;
	}
): Promise<boolean> {
	const [updated] = await db
		.update(pilotSurveyEnergy)
		.set({
			surveyEnergy: input.nextEnergy,
			lastUpdatedAt: new Date(input.nextLastUpdatedAtMs)
		})
		.where(
			and(
				eq(pilotSurveyEnergy.pilotId, input.pilotId),
				eq(pilotSurveyEnergy.surveyEnergy, input.expectedStoredEnergy),
				eq(pilotSurveyEnergy.lastUpdatedAt, input.expectedLastUpdatedAt)
			)
		)
		.returning();

	return Boolean(updated);
}

async function applyEquippedScannerWear(
	db: DbExecutor,
	input: {
		pilotId: string;
		conditionLoss: number;
		sourceType: string;
		sourceId: string;
	}
): Promise<void> {
	if (input.conditionLoss <= 0) {
		return;
	}

	const scanner = await getEquippedScannerForPilot(db, input.pilotId);
	if (!scanner) {
		return;
	}

	const before = { condition: scanner.condition, integrity: scanner.integrity };
	const after = applyProspectingScannerWear(before, input.conditionLoss);

	if (before.condition === after.condition && before.integrity === after.integrity) {
		return;
	}

	await db
		.update(items)
		.set({
			condition: after.condition,
			integrity: after.integrity
		})
		.where(eq(items.id, scanner.id));

	await appendItemConditionChangedLedger(db, {
		pilotId: input.pilotId,
		targetItemId: scanner.id,
		conditionBefore: before.condition,
		conditionAfter: after.condition,
		integrityBefore: before.integrity,
		integrityAfter: after.integrity,
		sourceType: input.sourceType,
		sourceId: input.sourceId,
		extraPayload: {
			context: 'prospecting_scanner_wear'
		}
	});
}

function depositSpotsForResourceInstance(
	row: {
		resourceSlug: string;
		concentrationMinPercent: number;
		concentrationMaxPercent: number;
		prospectingCycle: number;
	},
	bloomGenerationSeed: string
): DepositSpot[] {
	return generateDepositSpots({
		resourceSlug: row.resourceSlug,
		bloomGenerationSeed,
		concentrationMinPercent: row.concentrationMinPercent,
		concentrationMaxPercent: row.concentrationMaxPercent,
		prospectingCycle: row.prospectingCycle
	});
}

async function yieldBySpotIdForFamilyInstances(
	db: DbExecutor,
	input: {
		familyInstances: Array<{ id: string; resourceSlug: string }>;
		spotsByResourceSlug: Readonly<Record<string, readonly DepositSpot[]>>;
		bloomGenerationSeed: string;
	}
) {
	const spotIds: string[] = [];
	const resourceInstanceIdBySpotId: Record<string, string> = {};

	for (const instance of input.familyInstances) {
		const spots = input.spotsByResourceSlug[instance.resourceSlug] ?? [];
		for (const spot of spots) {
			spotIds.push(spot.spotId);
			resourceInstanceIdBySpotId[spot.spotId] = instance.id;
		}
	}

	const states = await loadDepositSpotYieldMap(db, {
		spotIds,
		resourceInstanceIdBySpotId,
		generationSeed: input.bloomGenerationSeed
	});

	return yieldPresentationMap(states);
}

/** Resolved survey progress for UI load — energy regen applied at `now`. */
export async function getPilotProspectingProgress(
	db: DbExecutor,
	pilotId: string,
	now: Date = new Date(),
	bloomId?: number
): Promise<PilotProspectingProgress> {
	const progress = await loadPilotSurveyProgress(db, pilotId, now.getTime(), bloomId);

	return {
		surveyEnergy: progress.surveyEnergy,
		lastEnergyUpdatedAtMs: progress.lastEnergyUpdatedAtMs,
		revealedResourceSlugs: [...progress.revealedResourceSlugs],
		sampledSpotIds: [...progress.sampledSpotIds]
	};
}

export type SurveyResourceCard = FamilyScanResourceView & {
	resourceInstanceId: string;
	recommended: boolean;
	statHints: Array<
		NonNullable<FamilyScanResourceView['statHints']>[number] & {
			emphasized: boolean;
		}
	> | null;
};

export type PreviewFamilyScanForPilotInput = {
	pilotId: string;
	family: ResourceFamily;
	now?: Date;
	bloomId?: number;
	recommendedResourceSlug?: string | null;
};

export async function hasPilotFamilyScan(
	db: DbExecutor,
	input: { pilotId: string; bloomId: number; family: ResourceFamily }
): Promise<boolean> {
	const [row] = await db
		.select({ id: pilotFamilyScans.id })
		.from(pilotFamilyScans)
		.where(
			and(
				eq(pilotFamilyScans.pilotId, input.pilotId),
				eq(pilotFamilyScans.bloomId, input.bloomId),
				eq(pilotFamilyScans.family, input.family)
			)
		)
		.limit(1);

	return Boolean(row);
}

async function recordPilotFamilyScan(
	tx: DbExecutor,
	input: { pilotId: string; bloomId: number; family: ResourceFamily; scannedAt: Date }
): Promise<void> {
	await tx
		.insert(pilotFamilyScans)
		.values({
			pilotId: input.pilotId,
			bloomId: input.bloomId,
			family: input.family,
			scannedAt: input.scannedAt
		})
		.onConflictDoNothing({
			target: [pilotFamilyScans.pilotId, pilotFamilyScans.bloomId, pilotFamilyScans.family]
		});
}

/** Read-only survey cards for UI load — only after a paid family scan for this bloom. */
export async function previewFamilyScanForPilot(
	db: DbExecutor,
	input: PreviewFamilyScanForPilotInput
): Promise<{
	resources: SurveyResourceCard[];
	surveyEnergy: number;
	activeBloomId: number;
}> {
	const now = input.now ?? new Date();
	const nowMs = now.getTime();
	const activeBloomId = input.bloomId ?? (await getActiveBloomId(db));
	const pilotProgress = await loadPilotSurveyProgress(
		db,
		input.pilotId,
		nowMs,
		activeBloomId
	);
	const resolved = resolveSurveyEnergy({
		storedEnergy: pilotProgress.surveyEnergy,
		lastUpdatedAtMs: pilotProgress.lastEnergyUpdatedAtMs,
		nowMs
	});
	const displayProgress: PilotSurveyProgress = {
		...pilotProgress,
		surveyEnergy: resolved.energy,
		lastEnergyUpdatedAtMs: resolved.lastUpdatedAtMs
	};
	const bloomGenerationSeed = await getBloomGenerationSeed(db, activeBloomId);
	const instanceRows = await listResourceInstancesForBloom(db, activeBloomId);
	const familyInstances = instanceRows.filter((row) => row.family === input.family);
	const resources = familyInstances.map(resourceInstanceToSurveyResource);
	const idBySlug = Object.fromEntries(familyInstances.map((row) => [row.resourceSlug, row.id]));

	const spotsByResourceSlug = Object.fromEntries(
		familyInstances.map((row) => [
			row.resourceSlug,
			depositSpotsForResourceInstance(row, bloomGenerationSeed)
		])
	);

	const scanner = await getEquippedScannerForPilot(db, input.pilotId);
	const surveyClarityScore = scanner?.propertyScores.survey_clarity ?? 0;
	const recommendedResourceSlug = input.recommendedResourceSlug ?? null;

	const yieldBySpotId = await yieldBySpotIdForFamilyInstances(db, {
		familyInstances,
		spotsByResourceSlug,
		bloomGenerationSeed
	});

	const views = buildFamilyScanPreview({
		family: input.family,
		resources,
		spotsByResourceSlug,
		yieldBySpotId,
		pilotProgress: displayProgress,
		bloomGenerationSeed,
		surveyClarityScore
	});

	return {
		activeBloomId,
		surveyEnergy: displayProgress.surveyEnergy,
		resources: views.map((view) => ({
			...view,
			resourceInstanceId: idBySlug[view.resourceSlug] ?? '',
			recommended: view.resourceSlug === recommendedResourceSlug,
			statHints: view.statHints
				? [...view.statHints]
						.map((hint) => ({
							...hint,
							emphasized: !isDeemphasizedSurveyStat(hint.stat, view.family)
						}))
						.sort((left, right) => Number(right.emphasized) - Number(left.emphasized))
				: null
		}))
	};
}

/** Fetch a pilot's sampled deposit spot, if any. */
export async function getPilotDepositSample(
	db: DbExecutor,
	input: { pilotId: string; resourceInstanceId: string; spotId: string }
) {
	const [row] = await db
		.select()
		.from(pilotDepositSpotSamples)
		.where(
			and(
				eq(pilotDepositSpotSamples.pilotId, input.pilotId),
				eq(pilotDepositSpotSamples.spotId, input.spotId),
				eq(pilotDepositSpotSamples.resourceInstanceId, input.resourceInstanceId)
			)
		)
		.limit(1);

	return row ?? null;
}

export type ScanFamilyForPilotInput = {
	pilotId: string;
	family: ResourceFamily;
	now?: Date;
	bloomId?: number;
};

export type ScanFamilyForPilotOutcome =
	| {
			status: 'ok';
			resources: FamilyScanResourceView[];
			surveyEnergy: number;
			energyCost: number;
	  }
	| { status: 'insufficient_energy' };

export async function scanFamilyForPilot(
	db: Db,
	input: ScanFamilyForPilotInput
): Promise<ScanFamilyForPilotOutcome> {
	const now = input.now ?? new Date();
	const nowMs = now.getTime();

	return db.transaction(async (tx) => {
		const bloomId = input.bloomId ?? (await getActiveBloomId(tx));
		const energyRow = await ensurePilotSurveyEnergyRow(tx, input.pilotId, now);
		const pilotProgress = await loadPilotSurveyProgress(tx, input.pilotId, nowMs, bloomId);
		const bloomGenerationSeed = await getBloomGenerationSeed(tx, bloomId);

		const instanceRows = await listResourceInstancesForBloom(tx, bloomId);
		const familyInstances = instanceRows.filter((row) => row.family === input.family);
		const resources = familyInstances.map(resourceInstanceToSurveyResource);

		const spotsByResourceSlug = Object.fromEntries(
			familyInstances.map((row) => [
				row.resourceSlug,
				depositSpotsForResourceInstance(row, bloomGenerationSeed)
			])
		);

		const scanner = await getEquippedScannerForPilot(tx, input.pilotId);
		const surveyClarityScore = scanner?.propertyScores.survey_clarity ?? 0;

		const yieldBySpotId = await yieldBySpotIdForFamilyInstances(tx, {
			familyInstances,
			spotsByResourceSlug,
			bloomGenerationSeed
		});

		const scanResult = scanFamilyProspect({
			family: input.family,
			resources,
			spotsByResourceSlug,
			yieldBySpotId,
			pilotProgress,
			bloomGenerationSeed,
			nowMs,
			surveyClarityScore
		});

		if ('error' in scanResult) {
			return { status: 'insufficient_energy' as const };
		}

		const persisted = await persistSurveyEnergySpend(tx, {
			pilotId: input.pilotId,
			expectedStoredEnergy: energyRow.surveyEnergy,
			expectedLastUpdatedAt: energyRow.lastUpdatedAt,
			nextEnergy: scanResult.pilotProgress.surveyEnergy,
			nextLastUpdatedAtMs: scanResult.pilotProgress.lastEnergyUpdatedAtMs
		});

		if (!persisted) {
			return { status: 'insufficient_energy' as const };
		}

		await recordPilotFamilyScan(tx, {
			pilotId: input.pilotId,
			bloomId,
			family: input.family,
			scannedAt: now
		});

		await applyEquippedScannerWear(tx, {
			pilotId: input.pilotId,
			conditionLoss: scanResult.scannerWear,
			sourceType: 'survey_family_scan',
			sourceId: `${input.family}:${nowMs}`
		});

		return {
			status: 'ok' as const,
			resources: scanResult.resources,
			surveyEnergy: scanResult.pilotProgress.surveyEnergy,
			energyCost: scanResult.energyCost
		};
	});
}

export type SampleSpotForPilotInput = {
	pilotId: string;
	resourceInstanceId: string;
	spotId: string;
	now?: Date;
	bloomId?: number;
};

export type SampleSpotForPilotOutcome =
	| {
			status: 'ok';
			trueConcentrationPercent: number;
			trickleQuantity: number;
			statsRevealedThisSample: boolean;
			surveyEnergy: number;
			energyCost: number;
			yieldBandLabel: string;
			yieldBand: string;
	  }
	| { status: 'insufficient_energy' }
	| { status: 'family_scan_required' }
	| { status: 'spot_already_sampled' }
	| { status: 'spot_not_found' }
	| { status: 'spot_resource_mismatch' }
	| { status: 'resource_not_found' };

export async function sampleSpotForPilot(
	db: Db,
	input: SampleSpotForPilotInput
): Promise<SampleSpotForPilotOutcome> {
	const now = input.now ?? new Date();
	const nowMs = now.getTime();

	return db.transaction(async (tx) => {
		const resourceRow = await getResourceInstanceById(tx, input.resourceInstanceId);
		if (!resourceRow) {
			return { status: 'resource_not_found' as const };
		}

		const bloomId = input.bloomId ?? resourceRow.bloomId;
		const family = resourceRow.family as ResourceFamily;

		if (
			!(await hasPilotFamilyScan(tx, {
				pilotId: input.pilotId,
				bloomId,
				family
			}))
		) {
			return { status: 'family_scan_required' as const };
		}

		const bloomGenerationSeed = await getBloomGenerationSeed(tx, bloomId);
		const resource = resourceInstanceToSurveyResource(resourceRow);
		const spot = findDepositSpot({
			resourceSlug: resource.resourceSlug,
			bloomGenerationSeed,
			concentrationMinPercent: resource.concentrationMinPercent,
			concentrationMaxPercent: resource.concentrationMaxPercent,
			prospectingCycle: resourceRow.prospectingCycle,
			spotId: input.spotId
		});
		if (!spot) {
			return { status: 'spot_not_found' as const };
		}

		const spots = depositSpotsForResourceInstance(resourceRow, bloomGenerationSeed);

		const energyRow = await ensurePilotSurveyEnergyRow(tx, input.pilotId, now);
		const pilotProgress = await loadPilotSurveyProgress(tx, input.pilotId, nowMs, bloomId);

		const sampleResult = sampleDepositSpot({
			resource,
			spot,
			pilotProgress,
			nowMs
		});

		if ('error' in sampleResult) {
			if (sampleResult.error === 'spot_already_sampled') {
				return { status: 'spot_already_sampled' as const };
			}
			if (sampleResult.error === 'spot_resource_mismatch') {
				return { status: 'spot_resource_mismatch' as const };
			}
			return { status: 'insufficient_energy' as const };
		}

		const persisted = await persistSurveyEnergySpend(tx, {
			pilotId: input.pilotId,
			expectedStoredEnergy: energyRow.surveyEnergy,
			expectedLastUpdatedAt: energyRow.lastUpdatedAt,
			nextEnergy: sampleResult.pilotProgress.surveyEnergy,
			nextLastUpdatedAtMs: sampleResult.pilotProgress.lastEnergyUpdatedAtMs
		});

		if (!persisted) {
			return { status: 'insufficient_energy' as const };
		}

		const [reservedSample] = await tx
			.insert(pilotDepositSpotSamples)
			.values({
				pilotId: input.pilotId,
				resourceInstanceId: input.resourceInstanceId,
				spotId: input.spotId,
				trueConcentrationPercent: spot.trueConcentrationPercent,
				sampledAt: now
			})
			.onConflictDoNothing({
				target: [pilotDepositSpotSamples.pilotId, pilotDepositSpotSamples.spotId]
			})
			.returning();

		if (!reservedSample) {
			return { status: 'spot_already_sampled' as const };
		}

		if (sampleResult.statsRevealedThisSample) {
			await tx
				.insert(pilotResourceStatReveals)
				.values({
					pilotId: input.pilotId,
					resourceInstanceId: input.resourceInstanceId,
					revealedAt: now
				})
				.onConflictDoNothing({
					target: [
						pilotResourceStatReveals.pilotId,
						pilotResourceStatReveals.resourceInstanceId
					]
				});
		}

		const stack = await grantResourceToPilotTx(tx, {
			pilotId: input.pilotId,
			resourceInstanceId: input.resourceInstanceId,
			quantity: sampleResult.trickleGrant.quantity,
			source: { type: 'survey_sample', id: reservedSample.id }
		});

		await appendEconomyLedgerEntry(tx, {
			eventType: 'survey_completed',
			pilotId: input.pilotId,
			resourceInstanceId: input.resourceInstanceId,
			resourceStackId: stack.id,
			quantityDelta: sampleResult.trickleGrant.quantity,
			payload: {
				family: resource.family,
				resource_instance_id: input.resourceInstanceId,
				spot: input.spotId,
				trickle_quantity: sampleResult.trickleGrant.quantity
			},
			createdAt: now
		});

		await applyEquippedScannerWear(tx, {
			pilotId: input.pilotId,
			conditionLoss: sampleResult.scannerWear,
			sourceType: 'survey_spot_sample',
			sourceId: reservedSample.id
		});

		const yieldBySpotId = await yieldBySpotIdForFamilyInstances(tx, {
			familyInstances: [resourceRow],
			spotsByResourceSlug: { [resource.resourceSlug]: spots },
			bloomGenerationSeed
		});
		const spotYield = yieldBySpotId[input.spotId];

		return {
			status: 'ok' as const,
			trueConcentrationPercent: sampleResult.trueConcentrationPercent,
			trickleQuantity: sampleResult.trickleGrant.quantity,
			statsRevealedThisSample: sampleResult.statsRevealedThisSample,
			surveyEnergy: sampleResult.pilotProgress.surveyEnergy,
			energyCost: sampleResult.energyCost,
			yieldBandLabel: spotYield?.yieldBandLabel ?? 'Rich deposit',
			yieldBand: spotYield?.yieldBand ?? 'rich'
		};
	});
}

/** Test helper — reset prospecting rows for a pilot. */
export async function clearPilotProspectingState(db: DbExecutor, pilotId: string) {
	await db.delete(pilotDepositSpotSamples).where(eq(pilotDepositSpotSamples.pilotId, pilotId));
	await db.delete(pilotResourceStatReveals).where(eq(pilotResourceStatReveals.pilotId, pilotId));
	await db.delete(pilotFamilyScans).where(eq(pilotFamilyScans.pilotId, pilotId));
	await db.delete(pilotSurveyEnergy).where(eq(pilotSurveyEnergy.pilotId, pilotId));
}

export { createEmptyPilotSurveyProgress };
