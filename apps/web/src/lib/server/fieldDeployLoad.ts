import {
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot
} from '@async-frontier-mmo/db';
import {
	availableTails,
	buildDeployPreview,
	extractionTailOptionsForHull,
	buildGearYieldPenaltySummary,
	computeThumperPartRunModifiers,
	hullTierFromIntegrity,
	TUTORIAL_RUN_1_YIELD_FLOOR,
	type ThumperPartSnapshot
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';
import {
	firstAsyncUnlockForEquippedHull,
	type FirstAsyncTailState
} from './firstAsyncTailState.js';

function partSummary(
	part: {
		displayName: string;
		condition: number;
		integrity: number;
	} | null
) {
	if (!part) return null;
	return {
		displayName: part.displayName,
		condition: part.condition,
		integrity: part.integrity
	};
}

function equippedPartSnapshots(
	equipped: Awaited<ReturnType<typeof getEquippedThumperPartsForPilot>>
): ThumperPartSnapshot[] {
	const snapshots: ThumperPartSnapshot[] = [];
	for (const slot of ['drill', 'pump', 'hull'] as const) {
		const part = equipped[slot];
		if (!part) continue;
		snapshots.push({
			slot,
			itemId: part.id,
			schematicId: part.schematicId,
			displayName: part.displayName,
			propertyScores: part.propertyScores,
			condition: part.condition,
			integrity: part.integrity
		});
	}
	return snapshots;
}

export function hullDeployContextFromEquipped(
	equipped: Awaited<ReturnType<typeof getEquippedThumperPartsForPilot>>,
	firstAsync: FirstAsyncTailState
) {
	const hullIntegrity = equipped.hull?.integrity ?? 100;
	const hullTier = hullTierFromIntegrity(hullIntegrity);
	const unlockFirstAsyncTail = firstAsyncUnlockForEquippedHull(hullIntegrity, firstAsync);
	const tailOptions = availableTails(hullTier, hullIntegrity, { unlockFirstAsyncTail });
	return {
		hullIntegrity,
		hullTier,
		allowedTailMinutes: tailOptions.map((tail) => tail.minutes),
		tailMenuOptions: extractionTailOptionsForHull(hullTier, hullIntegrity, { unlockFirstAsyncTail })
	};
}

export function allowedExtractionTailsForEquippedHull(
	equipped: Awaited<ReturnType<typeof getEquippedThumperPartsForPilot>>,
	firstAsync: FirstAsyncTailState
): number[] {
	return hullDeployContextFromEquipped(equipped, firstAsync).allowedTailMinutes;
}

export async function loadDeployPreviewForPilot(
	db: ReturnType<typeof getGameDb>,
	input: {
		pilotId: string;
		trueConcentrationPercent: number;
		extractionTailMinutes: number;
		isPushRun: boolean;
		isTutorialRun: boolean;
	}
) {
	const equipped = await getEquippedThumperPartsForPilot(db, input.pilotId);
	const scanner = await getEquippedScannerForPilot(db, input.pilotId);
	const surveyClarityScore = scanner?.propertyScores.survey_clarity ?? 0;
	const partModifiers = computeThumperPartRunModifiers(equippedPartSnapshots(equipped));

	const equippedParts = {
		drill: partSummary(equipped.drill),
		pump: partSummary(equipped.pump),
		hull: partSummary(equipped.hull)
	};

	const recoveryFloor = input.isTutorialRun ? TUTORIAL_RUN_1_YIELD_FLOOR : undefined;

	return {
		equippedParts,
		preview: buildDeployPreview({
			trueConcentrationPercent: input.trueConcentrationPercent,
			extractionTailMinutes: input.extractionTailMinutes,
			isPushRun: input.isPushRun,
			isTutorialRun: input.isTutorialRun,
			partModifiers,
			surveyClarityScore,
			equippedParts,
			recoveryFloor
		}),
		gearYieldPenalty: buildGearYieldPenaltySummary({
			isPushRun: input.isPushRun,
			trueConcentrationPercent: input.trueConcentrationPercent,
			extractionTailMinutes: input.extractionTailMinutes,
			isTutorialRun: input.isTutorialRun,
			partModifiers,
			recoveryFloor
		}),
		partModifiers
	};
}
