<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		previewCraftProperties,
		getPropertyOutputBand,
		type SchematicDefinition,
		type SchematicSlotFill,
		type SchematicReadinessAnalysis,
		type SchematicSlotReadiness,
		type TuningAllocation,
		type CraftPropertyPreview,
		TUNING_POINTS_TOTAL,
		canFillSlotWithStack,
		type CraftMode,
		type ExperimentPulse,
		type ExperimentPushSize
	} from '@async-frontier-mmo/domain';
	import SchematicDiagram from './SchematicDiagram.svelte';
	import SlotSelector from './SlotSelector.svelte';
	import TuningPanel from './TuningPanel.svelte';
	import PropertyPreview from './PropertyPreview.svelte';
	import CraftResultReveal from './CraftResultReveal.svelte';
	import type { WorkshopCraftOutcome } from '$lib/server/craftOutcome';

	interface InventoryStack {
		resourceInstanceId: string;
		resourceSlug: string;
		displayName: string;
		family: string;
		quantity: number;
		stats: {
			OQ: number;
			conductivity: number;
			hardness: number;
			heat_resistance: number;
			malleability: number;
		};
	}

	interface AllocationHint {
		resourceInstanceId: string;
		displayName: string;
		quantity: number;
		bestUse: string;
		otherUses: string[];
		stats: {
			OQ: number;
			conductivity: number;
			hardness: number;
			heat_resistance: number;
			malleability: number;
		};
	}

	interface Props {
		schematic: SchematicDefinition;
		inventory: InventoryStack[];
		allocationHints: AllocationHint[];
		defaultSelections?: Record<string, string>;
		craftOutcome?: WorkshopCraftOutcome | null;
		schematicReadiness: SchematicReadinessAnalysis;
		onCelebrateDismiss?: () => void;
	}

	let {
		schematic,
		inventory,
		allocationHints,
		defaultSelections = {},
		craftOutcome,
		schematicReadiness,
		onCelebrateDismiss
	}: Props = $props();

	function readinessForSlot(slotId: string): SchematicSlotReadiness | undefined {
		return schematicReadiness.slots.find((slot) => slot.slotId === slotId);
	}

	// Client state - all pure client-side, no page reloads
	let slotSelections = $state<Record<string, string>>({});
	let tuning = $state<TuningAllocation>({});
	let craftMode = $state<CraftMode>('safe_craft');
	let idempotencyKey = $state(generateIdempotencyKey());
	let crafting = $state(false);
	let benchReady = $state(false);
	let lockedCraftReveal = $state<WorkshopCraftOutcome | null>(null);
	let lastCraftedKey = $state<string | null>(null);

	// Track resource changes for delta animation
	let previousSlotFills = $state<SchematicSlotFill[] | null>(null);

	const EXPERIMENT_PUSH_OPTIONS: ReadonlyArray<{
		id: ExperimentPushSize;
		label: string;
		detail: string;
	}> = [
		{ id: 'careful', label: 'Careful', detail: '+1 band · 90% success' },
		{ id: 'standard', label: 'Standard', detail: '+2 bands · 65% success' },
		{ id: 'overdrive', label: 'Overdrive', detail: '+3 bands · 40% success · scrap on crit' }
	];

	function defaultExperimentPulses(definition: SchematicDefinition): ExperimentPulse[] {
		const first = definition.properties[0];
		const second = definition.properties[1] ?? first;
		if (!first) {
			return [];
		}
		return [
			{ propertyId: first.id, push: 'careful' },
			{ propertyId: second.id, push: 'standard' }
		];
	}

	let experimentPulses = $state<ExperimentPulse[]>([]);
	let boundSchematicId = $state<string | null>(null);

	// Reset bench state only when the schematic changes — not on every defaultSelections refresh.
	$effect(() => {
		if (boundSchematicId === schematic.id) {
			return;
		}

		boundSchematicId = schematic.id;
		slotSelections = { ...defaultSelections };
		tuning = {};
		lockedCraftReveal = null;
		lastCraftedKey = null;
		experimentPulses = defaultExperimentPulses(schematic);
		// idempotencyKey and craftMode persist per-page-load intentionally
	});

	function setPulseProperty(index: number, propertyId: string) {
		experimentPulses = experimentPulses.map((pulse, pulseIndex) =>
			pulseIndex === index ? { ...pulse, propertyId } : pulse
		);
	}

	function setPulsePush(index: number, push: ExperimentPushSize) {
		experimentPulses = experimentPulses.map((pulse, pulseIndex) =>
			pulseIndex === index ? { ...pulse, push } : pulse
		);
	}

	function generateIdempotencyKey(): string {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	}

	function stacksForFamily(family: string): InventoryStack[] {
		return inventory.filter(stack => stack.family === family);
	}

	function buildSlotFills(): SchematicSlotFill[] | null {
		const fills: SchematicSlotFill[] = [];

		for (const slot of schematic.slots) {
			const selectedId = slotSelections[slot.id];
			if (!selectedId) return null;

			const stack = inventory.find(s => s.resourceInstanceId === selectedId);
			if (!stack || stack.family !== slot.requiredFamily) return null;
			if (
				!canFillSlotWithStack({
					schematic,
					slotSelections,
					slotId: slot.id,
					resourceInstanceId: selectedId,
					stackQuantity: stack.quantity
				})
			) {
				return null;
			}

			fills.push({
				slotId: slot.id,
				resourceSlug: stack.resourceSlug,
				resourceDisplayName: stack.displayName,
				family: stack.family,
				stats: { ...stack.stats }
			});
		}

		return fills;
	}

	const slotFills = $derived(buildSlotFills());

	// Live preview from domain - instant, no server round-trip
	const livePreview: CraftPropertyPreview | null = $derived(
		slotFills ? previewCraftProperties(schematic, slotFills, tuning) : null
	);

	// Track when slot fills change for delta animation
	$effect(() => {
		if (slotFills) {
			previousSlotFills = slotFills;
		}
	});

	// Drop slot picks that no longer have enough quantity — but not while the craft reveal is frozen.
	$effect(() => {
		if (lockedCraftReveal) return;

		let changed = false;
		const nextSelections = { ...slotSelections };

		for (const slot of schematic.slots) {
			const selectedId = nextSelections[slot.id];
			if (!selectedId) continue;

			const stack = inventory.find((row) => row.resourceInstanceId === selectedId);
			if (
				!stack ||
				!canFillSlotWithStack({
					schematic,
					slotSelections: nextSelections,
					slotId: slot.id,
					resourceInstanceId: selectedId,
					stackQuantity: stack.quantity
				})
			) {
				delete nextSelections[slot.id];
				changed = true;
			}
		}

		if (changed) {
			slotSelections = nextSelections;
		}
	});

	// Freeze craft reveal until the player explicitly resets — inventory refresh must not clear it.
	$effect(() => {
		if (craftOutcome && craftOutcome.item.id !== lastCraftedKey) {
			lockedCraftReveal = craftOutcome;
			lastCraftedKey = craftOutcome.item.id;
		}
	});

	function handleSlotSelect(slotId: string, instanceId: string) {
		if (lockedCraftReveal) return;
		slotSelections = { ...slotSelections, [slotId]: instanceId };
	}

	function handleTuningChange(propertyId: string, points: number) {
		if (lockedCraftReveal) return;
		tuning = { ...tuning, [propertyId]: points };
	}

	function handleModeChange(mode: CraftMode) {
		if (lockedCraftReveal) return;
		craftMode = mode;
	}

	function getTotalTuningPoints(): number {
		return Object.values(tuning).reduce((sum, p) => sum + (p ?? 0), 0);
	}

	function canCraft(): boolean {
		if (!slotFills) return false;
		if (getTotalTuningPoints() !== TUNING_POINTS_TOTAL) return false;
		return true;
	}

	function craftAnother() {
		idempotencyKey = generateIdempotencyKey();
		lockedCraftReveal = null;
		// Keep lastCraftedKey so stale action data cannot reopen the dismissed reveal.
		tuning = {};
		onCelebrateDismiss?.();
	}

	const handleSubmit: SubmitFunction = () => {
		crafting = true;
		return async ({ update }) => {
			await update({ reset: false });
			crafting = false;
		};
	};

	onMount(() => {
		benchReady = true;
	});
</script>

<div class="workshop-bench panel" data-workshop-ready={benchReady ? 'true' : undefined}>
	<SchematicDiagram
		title={schematic.displayName}
		slots={schematic.slots.map((slot) => ({ id: slot.id, displayName: slot.displayName }))}
	/>
	{#if lockedCraftReveal}
		<CraftResultReveal
			{schematic}
			craftOutcome={lockedCraftReveal}
			onCraftAnother={craftAnother}
		/>
	{:else if !schematicReadiness.craftableNow}
		<div class="blockers-panel" role="alert">
			<h3>Can't craft yet</h3>
			<ul class="blockers-list">
				{#each schematicReadiness.blockers as blocker}
					<li>{blocker}</li>
				{/each}
			</ul>
			<p class="blockers-actions">
				<a href="/field">Go to FIELD →</a>
				·
				<a href="/settlement">Go to SETTLEMENT →</a>
			</p>
		</div>
	{:else}
		<form method="POST" action="?/craft" use:enhance={handleSubmit} class="craft-form">
			<input type="hidden" name="schematicId" value={schematic.id} />
			<input type="hidden" name="idempotencyKey" value={idempotencyKey} />

			<!-- Resource Slot Selection -->
			<section class="slots-section">
				<h3>Choose Resources</h3>
				<p class="section-help">
					Each slot shows stats that matter for this schematic. Compare cards to see tradeoffs.
				</p>

				{#each schematic.slots as slot (slot.id)}
					{@const stacks = stacksForFamily(slot.requiredFamily)}
					{@const slotReadiness = readinessForSlot(slot.id)}
				<SlotSelector
					{schematic}
					{slot}
					{stacks}
					hints={allocationHints}
					allSlotSelections={slotSelections}
					selectedInstanceId={slotSelections[slot.id] ?? null}
					onSelect={(id) => handleSlotSelect(slot.id, id)}
					currentSlotFills={slotFills}
					{tuning}
					{livePreview}
					{slotReadiness}
				/>
					<input
						type="hidden"
						name="slot_{slot.id}"
						value={slotSelections[slot.id] ?? ''}
					/>
				{/each}
			</section>

			<!-- Live Property Preview -->
			{#if livePreview}
				<PropertyPreview
					preview={livePreview}
					{previousSlotFills}
					{tuning}
				/>
			{/if}

			<!-- Tuning Panel -->
			<TuningPanel
				{schematic}
				{slotFills}
				{tuning}
				onTuningChange={handleTuningChange}
			/>

			{#each schematic.properties as property}
				<input
					type="hidden"
					name="tuning_{property.id}"
					value={tuning[property.id] ?? 0}
				/>
			{/each}

			<!-- Craft Mode Selection -->
			<section class="craft-mode-section">
				<h3>Craft Mode</h3>
				<div class="mode-options">
					<button
						type="button"
						class="mode-btn"
						class:selected={craftMode === 'safe_craft'}
						onclick={() => handleModeChange('safe_craft')}
					>
						<span class="mode-title">Safe Craft</span>
						<span class="mode-stakes">Exactly what the preview shows. No surprises, no flaws.</span>
						<span class="mode-ceiling">Max: tuned score</span>
					</button>
					<button
						type="button"
						class="mode-btn"
						class:selected={craftMode === 'careful_experiment'}
						onclick={() => handleModeChange('careful_experiment')}
					>
						<span class="mode-title">Experiment (2 pulses)</span>
						<span class="mode-stakes"
							>Per pulse: Careful +1 / Standard +2 / Overdrive +3 bands. Crits cost durability or
							scrap.</span
						>
						<span class="mode-ceiling">Resource quality caps each line</span>
					</button>
				</div>
				<input type="hidden" name="craftMode" value={craftMode} />
			</section>

			{#if craftMode === 'careful_experiment'}
				<section class="experiment-pulses">
					<h3>Experiment pulses</h3>
					{#each experimentPulses as pulse, index (index)}
						<div class="pulse-row">
							<p class="pulse-row__title">Pulse {index + 1}</p>
							<label class="pulse-row__field">
								<span>Property line</span>
								<select
									value={pulse.propertyId}
									onchange={(event) =>
										setPulseProperty(index, event.currentTarget.value)}
								>
									{#each schematic.properties as property (property.id)}
										<option value={property.id}>{property.displayName}</option>
									{/each}
								</select>
							</label>
							<div class="push-options" role="group" aria-label="Push size for pulse {index + 1}">
								{#each EXPERIMENT_PUSH_OPTIONS as option (option.id)}
									<button
										type="button"
										class="push-btn"
										class:selected={pulse.push === option.id}
										onclick={() => setPulsePush(index, option.id)}
									>
										<span class="push-btn__label">{option.label}</span>
										<span class="push-btn__detail">{option.detail}</span>
									</button>
								{/each}
							</div>
							<input type="hidden" name="pulse_{index}_property" value={pulse.propertyId} />
							<input type="hidden" name="pulse_{index}_push" value={pulse.push} />
						</div>
					{/each}
				</section>
			{/if}

			<button
				type="submit"
				class="craft-submit-btn"
				disabled={!canCraft() || crafting}
			>
				{#if crafting}
					Crafting...
				{:else if !slotFills}
					Select resources for all slots
				{:else if getTotalTuningPoints() !== TUNING_POINTS_TOTAL}
					Allocate your {TUNING_POINTS_TOTAL} tuning points ({getTotalTuningPoints()} of {TUNING_POINTS_TOTAL} spent)
				{:else}
					Craft {schematic.displayName}
				{/if}
			</button>
		</form>
	{/if}
</div>

<style>
	.workshop-bench {
		padding: 1rem;
	}

	.blockers-panel {
		padding: 1rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.blockers-panel h3 {
		margin: 0 0 0.75rem;
		color: var(--accent-warning);
		font-size: 1rem;
	}

	.blockers-list {
		margin: 0 0 0.75rem;
		padding-left: 1.25rem;
		color: var(--text-secondary);
		font-size: 0.9rem;
		line-height: 1.45;
	}

	.blockers-list li {
		margin-bottom: 0.35rem;
	}

	.blockers-actions {
		margin: 0;
		font-size: 0.9rem;
	}

	.craft-form {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.slots-section {
		margin-bottom: 0.5rem;
	}

	.slots-section h3 {
		margin: 0 0 0.25rem 0;
		font-size: 1.1rem;
	}

	.section-help {
		margin: 0 0 0.75rem 0;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	/* Craft Mode Section */
	.craft-mode-section {
		padding: 1rem;
		background: var(--bg-inset);
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
	}

	.craft-mode-section h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
	}

	.mode-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.mode-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.875rem;
		border: 2px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-panel);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.mode-btn:hover {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.mode-btn.selected {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
		box-shadow: 0 2px 4px rgba(96, 165, 250, 0.15);
	}

	.mode-title {
		font-weight: 600;
		font-size: 0.95rem;
		margin-bottom: 0.35rem;
	}

	.mode-stakes {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin-bottom: 0.25rem;
		line-height: 1.4;
	}

	.mode-ceiling {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.experiment-pulses {
		margin-top: 1rem;
		padding-top: 1rem;
		border-top: 1px solid var(--border-subtle);
	}

	.experiment-pulses h3 {
		margin: 0 0 0.75rem;
		font-size: 1rem;
	}

	.pulse-row {
		display: flex;
		flex-direction: column;
		gap: 0.65rem;
		margin-bottom: 1rem;
		padding: 0.875rem;
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-inset);
	}

	.pulse-row__title {
		margin: 0;
		font-size: 0.85rem;
		color: var(--phosphor);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.pulse-row__field {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.pulse-row__field select {
		padding: 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		background: var(--bg-panel);
		color: var(--text-primary);
		font-family: inherit;
	}

	.push-options {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.push-btn {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
		padding: 0.75rem;
		border: 2px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-panel);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
	}

	.push-btn.selected {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.push-btn__label {
		font-weight: 600;
		font-size: 0.9rem;
	}

	.push-btn__detail {
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.craft-submit-btn {
		margin-top: 0.5rem;
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		background: var(--phosphor);
		color: var(--bg-base);
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 3rem;
	}

	.craft-submit-btn:hover:not(:disabled) {
		background: #93c5fd;
	}

	.craft-submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: var(--bg-inset);
	}

	@media (min-width: 640px) {
		.mode-options {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
