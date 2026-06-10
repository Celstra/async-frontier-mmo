import { and, eq } from 'drizzle-orm';
import {
	buildCraftResultExplanation,
	CRAFT_QUANTITY_PER_SLOT,
	previewCraftProperties,
	resolveCraft,
	SchematicSlotValidationError,
	SURVEY_SCANNER_MK_I,
	TuningValidationError,
	type CraftMode,
	type SchematicDefinition,
	type SchematicSlotFill,
	type TuningAllocation
} from '@async-frontier-mmo/domain';
import type { ResourceFamily } from '@async-frontier-mmo/domain';
import type { Db, DbExecutor } from '../client.js';
import { appendEconomyLedgerEntry } from './economyLedger.js';
import { craftingAttempts, type CraftSlotSelection } from '../schema/craftingAttempts.js';
import { items, type CraftSlotProvenance } from '../schema/items.js';
import { getResourceInstanceById } from './resourceInstances.js';
import { getResourceStackForPilotInstance } from './resourceGrants.js';
import { consumeResourceFromPilotTx, InsufficientResourceError } from './resourceConsumes.js';

export class CraftValidationError extends Error {
	constructor(message: string) {
		super(message);
		this.name = 'CraftValidationError';
	}
}

type ResourceInstanceRow = NonNullable<Awaited<ReturnType<typeof getResourceInstanceById>>>;

export type CraftSlotInput = {
	slotId: string;
	resourceInstanceId: string;
};

export type CraftSchematicInput = {
	pilotId: string;
	idempotencyKey: string;
	schematic: SchematicDefinition;
	slotInputs: CraftSlotInput[];
	tuning: TuningAllocation;
	craftMode: CraftMode;
	experimentSeed?: string;
};

export type CraftSchematicSuccess = {
	status: 'crafted';
	attempt: typeof craftingAttempts.$inferSelect;
	item: typeof items.$inferSelect;
	explanation: ReturnType<typeof buildCraftResultExplanation>;
};

export type CraftSchematicOutcome =
	| CraftSchematicSuccess
	| {
			status: 'already_crafted';
			attempt: typeof craftingAttempts.$inferSelect;
			item: typeof items.$inferSelect;
			explanation: ReturnType<typeof buildCraftResultExplanation>;
	  }
	| { status: 'invalid_craft'; reason: string };

function statsFromInstance(instance: ResourceInstanceRow) {
	return {
		OQ: instance.statOq,
		conductivity: instance.statConductivity,
		hardness: instance.statHardness,
		heat_resistance: instance.statHeatResistance,
		malleability: instance.statMalleability
	} as const;
}

async function resolveSlotFills(
	db: DbExecutor,
	pilotId: string,
	schematic: SchematicDefinition,
	slotInputs: CraftSlotInput[]
): Promise<{ slotFills: SchematicSlotFill[]; provenance: CraftSlotProvenance[]; selections: CraftSlotSelection[] }> {
	if (slotInputs.length !== schematic.slots.length) {
		throw new CraftValidationError('Every schematic slot must be filled');
	}

	const slotFills: SchematicSlotFill[] = [];
	const provenance: CraftSlotProvenance[] = [];
	const selections: CraftSlotSelection[] = [];

	for (const slot of schematic.slots) {
		const input = slotInputs.find((candidate) => candidate.slotId === slot.id);
		if (!input) {
			throw new CraftValidationError(`Missing slot selection for "${slot.id}"`);
		}

		const instance = await getResourceInstanceById(db, input.resourceInstanceId);
		if (!instance) {
			throw new CraftValidationError(`Unknown resource instance for slot "${slot.id}"`);
		}

		if (instance.family !== slot.requiredFamily) {
			throw new CraftValidationError(
				`Slot "${slot.id}" requires ${slot.requiredFamily}, got ${instance.family}`
			);
		}

		const stack = await getResourceStackForPilotInstance(db, pilotId, instance.id);
		if (!stack || stack.quantity < CRAFT_QUANTITY_PER_SLOT) {
			throw new InsufficientResourceError(
				`Insufficient ${instance.displayName} for slot "${slot.id}"`
			);
		}

		slotFills.push({
			slotId: slot.id,
			resourceSlug: instance.resourceSlug,
			resourceDisplayName: instance.displayName,
			family: instance.family as ResourceFamily,
			stats: { ...statsFromInstance(instance) }
		});

		provenance.push({
			slotId: slot.id,
			slotDisplayName: slot.displayName,
			resourceInstanceId: instance.id,
			resourceSlug: instance.resourceSlug,
			resourceDisplayName: instance.displayName,
			family: instance.family,
			quantityConsumed: CRAFT_QUANTITY_PER_SLOT
		});

		selections.push({
			slotId: slot.id,
			resourceInstanceId: instance.id,
			quantity: CRAFT_QUANTITY_PER_SLOT
		});
	}

	return { slotFills, provenance, selections };
}

async function getCraftingAttemptByIdempotency(
	db: DbExecutor,
	pilotId: string,
	idempotencyKey: string
) {
	const [attempt] = await db
		.select()
		.from(craftingAttempts)
		.where(
			and(
				eq(craftingAttempts.pilotId, pilotId),
				eq(craftingAttempts.idempotencyKey, idempotencyKey)
			)
		)
		.limit(1);

	return attempt ?? null;
}

async function loadCompletedCraft(
	db: DbExecutor,
	attempt: typeof craftingAttempts.$inferSelect
): Promise<CraftSchematicSuccess | null> {
	if (attempt.status !== 'completed' || !attempt.itemId) {
		return null;
	}

	const [item] = await db.select().from(items).where(eq(items.id, attempt.itemId)).limit(1);
	if (!item) {
		return null;
	}

	return {
		status: 'crafted',
		attempt,
		item,
		explanation: attempt.resultExplanation as ReturnType<typeof buildCraftResultExplanation>
	};
}

function mapCraftError(error: unknown): CraftSchematicOutcome {
	if (error instanceof CraftValidationError || error instanceof InsufficientResourceError) {
		return { status: 'invalid_craft', reason: error.message };
	}
	if (
		error instanceof SchematicSlotValidationError ||
		error instanceof TuningValidationError
	) {
		return { status: 'invalid_craft', reason: error.message };
	}
	throw error;
}

/**
 * Transactional craft commit — consumes stacks, creates item + audit rows, idempotent by key.
 */
export async function craftSchematicForPilot(
	db: Db,
	input: CraftSchematicInput
): Promise<CraftSchematicOutcome> {
	try {
		return await db.transaction(async (tx) => {
			const existing = await getCraftingAttemptByIdempotency(
				tx,
				input.pilotId,
				input.idempotencyKey
			);
			if (existing) {
				const completed = await loadCompletedCraft(tx, existing);
				if (completed) {
					return {
						status: 'already_crafted' as const,
						attempt: completed.attempt,
						item: completed.item,
						explanation: completed.explanation
					};
				}
			}

			const { slotFills, provenance, selections } = await resolveSlotFills(
				tx,
				input.pilotId,
				input.schematic,
				input.slotInputs
			);

			const preview = previewCraftProperties(input.schematic, slotFills, input.tuning);
			const resolution = resolveCraft({
				schematic: input.schematic,
				slotFills,
				tuning: input.tuning,
				mode: input.craftMode,
				experimentSeed: input.experimentSeed
			});
			const explanation = buildCraftResultExplanation({
				schematic: input.schematic,
				slotFills,
				tuning: input.tuning,
				resolution
			});

			const propertyScores = Object.fromEntries(
				resolution.lines.map((line) => [line.propertyId, line.finalScore])
			);

			const [insertedAttempt] = await tx
				.insert(craftingAttempts)
				.values({
					pilotId: input.pilotId,
					idempotencyKey: input.idempotencyKey,
					schematicId: input.schematic.id,
					schematicVersion: input.schematic.version,
					craftMode: input.craftMode,
					experimentSeed: input.experimentSeed ?? null,
					tuning: input.tuning,
					slotSelections: selections,
					preview,
					resultExplanation: explanation,
					experimentOutcome: resolution.experimentOutcome ?? null,
					hasMinorFlaw: resolution.hasMinorFlaw,
					status: 'in_progress'
				})
				.onConflictDoNothing({
					target: [craftingAttempts.pilotId, craftingAttempts.idempotencyKey]
				})
				.returning();

			if (!insertedAttempt) {
				const existingAttempt = await getCraftingAttemptByIdempotency(
					tx,
					input.pilotId,
					input.idempotencyKey
				);
				if (!existingAttempt) {
					throw new Error('Failed to create or load crafting attempt');
				}

				const replay = await loadCompletedCraft(tx, existingAttempt);
				if (replay) {
					return {
						status: 'already_crafted' as const,
						attempt: replay.attempt,
						item: replay.item,
						explanation: replay.explanation
					};
				}

				throw new CraftValidationError('Craft already in progress for this idempotency key');
			}

			const attemptRow = insertedAttempt;

			for (const selection of selections) {
				await consumeResourceFromPilotTx(tx, {
					pilotId: input.pilotId,
					resourceInstanceId: selection.resourceInstanceId,
					quantity: selection.quantity,
					source: { type: 'crafting_attempt', id: attemptRow.id }
				});
			}

			const [item] = await tx
				.insert(items)
				.values({
					pilotId: input.pilotId,
					schematicId: input.schematic.id,
					schematicVersion: input.schematic.version,
					displayName: input.schematic.displayName,
					propertyScores,
					provenance,
					hasMinorFlaw: resolution.hasMinorFlaw
				})
				.returning();

			await tx
				.update(craftingAttempts)
				.set({
					itemId: item!.id,
					status: 'completed',
					experimentOutcome: resolution.experimentOutcome ?? null,
					hasMinorFlaw: resolution.hasMinorFlaw,
					resultExplanation: explanation,
					preview
				})
				.where(eq(craftingAttempts.id, attemptRow.id));

			await appendEconomyLedgerEntry(tx, {
				eventType: 'item_crafted',
				pilotId: input.pilotId,
				payload: {
					source_type: 'crafting_attempt',
					source_id: attemptRow.id,
					item_id: item!.id,
					schematic_id: input.schematic.id,
					schematic_version: input.schematic.version,
					craft_mode: input.craftMode,
					has_minor_flaw: resolution.hasMinorFlaw
				}
			});

			const [completedAttempt] = await tx
				.select()
				.from(craftingAttempts)
				.where(eq(craftingAttempts.id, attemptRow.id))
				.limit(1);

			return {
				status: 'crafted',
				attempt: completedAttempt!,
				item: item!,
				explanation
			};
		});
	} catch (error) {
		return mapCraftError(error);
	}
}

/** Convenience wrapper for the first-session Survey Scanner craft. */
export function craftSurveyScannerForPilot(db: Db, input: Omit<CraftSchematicInput, 'schematic'>) {
	return craftSchematicForPilot(db, { ...input, schematic: SURVEY_SCANNER_MK_I });
}
