<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		previewCraftProperties,
		type SchematicDefinition,
		type SchematicSlotFill,
		type SchematicReadinessAnalysis,
		type SchematicSlotReadiness,
		type TuningAllocation,
		TUNING_POINTS_TOTAL,
		canFillSlotWithStack,
		type CraftMode,
		type ExperimentPulse,
		type ExperimentPushSize
	} from '@async-frontier-mmo/domain';
	import ResourceSlotPickerSheet from './ResourceSlotPickerSheet.svelte';
	import TuningPanel from './TuningPanel.svelte';
	import ExperimentPulsePanel from './ExperimentPulsePanel.svelte';
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

	interface Props {
		schematic: SchematicDefinition;
		inventory: InventoryStack[];
		defaultSelections?: Record<string, string>;
		craftOutcome?: WorkshopCraftOutcome | null;
		schematicReadiness: SchematicReadinessAnalysis;
		onCelebrateDismiss?: () => void;
		slotSelections?: Record<string, string>;
		activeSlotId?: string | null;
		returnFocus?: HTMLElement | null;
	}

	let {
		schematic,
		inventory,
		defaultSelections = {},
		craftOutcome,
		schematicReadiness,
		onCelebrateDismiss,
		slotSelections = $bindable({}),
		activeSlotId = $bindable(null),
		returnFocus = null
	}: Props = $props();

	function readinessForSlot(slotId: string): SchematicSlotReadiness | undefined {
		return schematicReadiness.slots.find((slot) => slot.slotId === slotId);
	}

	// Client state - all pure client-side, no page reloads
	let tuning = $state<TuningAllocation>({});
	let craftMode = $state<CraftMode>('safe_craft');
	let idempotencyKey = $state(generateIdempotencyKey());
	let crafting = $state(false);
	let benchReady = $state(false);
	let lockedCraftReveal = $state<WorkshopCraftOutcome | null>(null);
	let lastCraftedKey = $state<string | null>(null);

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

	type BenchDraft = {
		slotSelections: Record<string, string>;
		tuning: TuningAllocation;
		craftMode: CraftMode;
		experimentPulses: ExperimentPulse[];
	};

	function benchDraftKey(schematicId: string): string {
		return `workshop-bench-draft:${schematicId}`;
	}

	function readBenchDraft(schematicId: string): BenchDraft | null {
		if (typeof sessionStorage === 'undefined') return null;
		try {
			const raw = sessionStorage.getItem(benchDraftKey(schematicId));
			if (!raw) return null;
			return JSON.parse(raw) as BenchDraft;
		} catch {
			return null;
		}
	}

	function writeBenchDraft(schematicId: string, draft: BenchDraft): void {
		if (typeof sessionStorage === 'undefined') return;
		try {
			sessionStorage.setItem(benchDraftKey(schematicId), JSON.stringify(draft));
		} catch {
			// Ignore quota errors — draft persistence is best-effort.
		}
	}

	function clearBenchDraft(schematicId: string): void {
		if (typeof sessionStorage === 'undefined') return;
		sessionStorage.removeItem(benchDraftKey(schematicId));
	}

	// Reset bench state only when the schematic changes — not on every defaultSelections refresh.
	$effect(() => {
		if (boundSchematicId === schematic.id) {
			return;
		}

		boundSchematicId = schematic.id;
		const draft = readBenchDraft(schematic.id);
		slotSelections = draft?.slotSelections ?? { ...defaultSelections };
		tuning = draft?.tuning ?? {};
		craftMode = draft?.craftMode ?? 'safe_craft';
		experimentPulses = draft?.experimentPulses ?? defaultExperimentPulses(schematic);
		lockedCraftReveal = null;
		lastCraftedKey = null;
		// idempotencyKey persists per-page-load intentionally
	});

	$effect(() => {
		if (boundSchematicId !== schematic.id || lockedCraftReveal) {
			return;
		}

		writeBenchDraft(schematic.id, {
			slotSelections,
			tuning,
			craftMode,
			experimentPulses
		});
	});

	function setPulseProperty(index: number, propertyId: string) {
		const currentPush = experimentPulses[index]?.push ?? 'careful';
		experimentPulses = experimentPulses.map((pulse, pulseIndex) =>
			pulseIndex === index ? { ...pulse, propertyId } : pulse
		);
		void postBenchTelemetry('experiment_pulse_configured', {
			pulseIndex: index,
			propertyId,
			push: currentPush
		});
	}

	function setPulsePush(index: number, push: ExperimentPushSize) {
		const currentPropertyId = experimentPulses[index]?.propertyId ?? '';
		experimentPulses = experimentPulses.map((pulse, pulseIndex) =>
			pulseIndex === index ? { ...pulse, push } : pulse
		);
		void postBenchTelemetry('experiment_pulse_configured', {
			pulseIndex: index,
			propertyId: currentPropertyId,
			push
		});
	}

	async function postBenchTelemetry(
		telemetryEvent:
			| 'resource_slot_filled'
			| 'resource_slot_replaced'
			| 'tuning_changed'
			| 'experiment_pulse_configured',
		payload: Record<string, unknown>
	) {
		const body = new FormData();
		body.set('telemetryEvent', telemetryEvent);
		body.set('schematicId', schematic.id);
		body.set('payload', JSON.stringify(payload));
		await fetch('?/benchTelemetry', { method: 'POST', body, keepalive: true });
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

	const craftPreview = $derived(
		slotFills ? previewCraftProperties(schematic, slotFills, tuning) : null
	);

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
		const previousId = slotSelections[slotId];
		slotSelections = { ...slotSelections, [slotId]: instanceId };
		activeSlotId = slotId;
		const stack = inventory.find((row) => row.resourceInstanceId === instanceId);
		if (!stack) return;

		const stats = { ...stack.stats };
		if (previousId && previousId !== instanceId) {
			void postBenchTelemetry('resource_slot_replaced', {
				slotId,
				fromResourceInstanceId: previousId,
				toResourceInstanceId: instanceId,
				toResourceSlug: stack.resourceSlug,
				stats
			});
		} else if (!previousId) {
			void postBenchTelemetry('resource_slot_filled', {
				slotId,
				resourceInstanceId: instanceId,
				resourceSlug: stack.resourceSlug,
				stats
			});
		}
	}

	function handleTuningChange(propertyId: string, points: number) {
		if (lockedCraftReveal) return;
		const nextTuning = { ...tuning, [propertyId]: points };
		tuning = nextTuning;
		void postBenchTelemetry('tuning_changed', { allocation: nextTuning });
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
		clearBenchDraft(schematic.id);
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
	{#if lockedCraftReveal}
		<CraftResultReveal
			{schematic}
			craftOutcome={lockedCraftReveal}
			onCraftAnother={craftAnother}
			onFavoriteChanged={(nextFavorited) => {
				if (!lockedCraftReveal) return;
				lockedCraftReveal = {
					...lockedCraftReveal,
					item: { ...lockedCraftReveal.item, favorited: nextFavorited }
				};
			}}
			onReclaimed={craftAnother}
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
				Try another bench resource combination or reclaim a crafted item for more stock.
			</p>
		</div>
	{:else}
		<form method="POST" action="?/craft" use:enhance={handleSubmit} class="craft-form">
			<input type="hidden" name="schematicId" value={schematic.id} />
			<input type="hidden" name="idempotencyKey" value={idempotencyKey} />

			<!-- Resource slots (filled via assembly diagram + pop-out picker) -->
			{#each schematic.slots as slot (slot.id)}
				<input
					type="hidden"
					name="slot_{slot.id}"
					value={slotSelections[slot.id] ?? ''}
				/>
			{/each}

			<!-- Property preview + tuning allocation -->
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
				<ExperimentPulsePanel
					{schematic}
					pulses={experimentPulses}
					preview={craftPreview}
					onPropertyChange={setPulseProperty}
					onPushChange={setPulsePush}
				/>
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

	{#if activeSlotId && !lockedCraftReveal}
		{@const activeSlot = schematic.slots.find((slot) => slot.id === activeSlotId)}
		{#if activeSlot}
			<ResourceSlotPickerSheet
				{schematic}
				slot={activeSlot}
				stacks={stacksForFamily(activeSlot.requiredFamily)}
				allSlotSelections={slotSelections}
				selectedInstanceId={slotSelections[activeSlot.id] ?? null}
				slotReadiness={readinessForSlot(activeSlot.id)}
				onSelect={(id) => handleSlotSelect(activeSlot.id, id)}
				onClose={() => {
					activeSlotId = null;
				}}
				{returnFocus}
			/>
		{/if}
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
