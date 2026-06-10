import {
	getEquippedScannerForPilot,
	getEquippedThumperPartsForPilot
} from '@async-frontier-mmo/db';
import {
	buildDeployPreview,
	computeThumperPartRunModifiers,
	FIRST_SESSION_SCANNER_MINIMUM,
	type ThumperPartSnapshot
} from '@async-frontier-mmo/domain';
import type { getGameDb } from './gameDb.js';

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

	return {
		equippedParts,
		preview: buildDeployPreview({
			trueConcentrationPercent: input.trueConcentrationPercent,
			extractionTailMinutes: input.extractionTailMinutes,
			isPushRun: input.isPushRun,
			partModifiers,
			surveyClarityScore,
			equippedParts,
			recoveryFloor: input.isTutorialRun ? FIRST_SESSION_SCANNER_MINIMUM : undefined
		}),
		partModifiers
	};
}
