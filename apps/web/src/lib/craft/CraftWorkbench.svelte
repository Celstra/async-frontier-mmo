<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import { equipTargetForSchematic } from './equipCraftedItem.js';
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
		type PropertyOutputBand
	} from '@async-frontier-mmo/domain';
	import SlotSelector from './SlotSelector.svelte';
	import TuningPanel from './TuningPanel.svelte';
	import PropertyPreview from './PropertyPreview.svelte';

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

	interface CraftOutcome {
		status: string;
		item: {
			id: string;
			displayName: string;
			condition: number;
			integrity: number;
			hasMinorFlaw: boolean;
		};
		explanation: {
			summary: string;
			modeContribution: string;
			properties: Array<{
				displayName: string;
				propertyId: string;
				finalScore: number;
				finalBand: string;
				baseScore: number;
				tunedScore: number;
				tuningPoints: number;
				drivers: Array<{ label: string; statValue: number; weightPercent: number }>;
			}>;
		};
	}

	interface Props {
		schematic: SchematicDefinition;
		inventory: InventoryStack[];
		allocationHints: AllocationHint[];
		defaultSelections?: Record<string, string>;
		craftOutcome?: CraftOutcome | null;
		schematicReadiness: SchematicReadinessAnalysis;
		onCelebrateDismiss?: () => void;
		onEquipCrafted?: SubmitFunction;
	}

	let {
		schematic,
		inventory,
		allocationHints,
		defaultSelections = {},
		craftOutcome,
		schematicReadiness,
		onCelebrateDismiss,
		onEquipCrafted
	}: Props = $props();

	const equipTarget = $derived(equipTargetForSchematic(schematic.id));

	function readinessForSlot(slotId: string): SchematicSlotReadiness | undefined {
		return schematicReadiness.slots.find((slot) => slot.slotId === slotId);
	}

	// Client state - all pure client-side, no page reloads
	let slotSelections = $state<Record<string, string>>({});
	let tuning = $state<TuningAllocation>({});
	let craftMode = $state<CraftMode>('safe_craft');
	let idempotencyKey = $state(generateIdempotencyKey());
	let crafting = $state(false);
	let showResult = $state(false);
	let lastCraftedKey = $state<string | null>(null);
	let resultPanelEl = $state<HTMLElement | null>(null);

	// Track resource changes for delta animation
	let previousSlotFills = $state<SchematicSlotFill[] | null>(null);

	// Reset state when schematic changes (fixes state_referenced_locally warnings)
	$effect(() => {
		const schematicId = schematic.id;
		const selections = { ...defaultSelections };
		// Batch state updates — tuning starts empty; player spends the 3-point pool manually
		slotSelections = selections;
		tuning = {};
		showResult = false;
		// idempotencyKey and craftMode persist per-page-load intentionally
	});

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

	// Drop slot picks that no longer have enough quantity (e.g. after a prior craft).
	$effect(() => {
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

	// When form returns a craft outcome, show it inline and scroll it into view
	$effect(() => {
		if (craftOutcome && craftOutcome.item.id !== lastCraftedKey) {
			showResult = true;
			lastCraftedKey = craftOutcome.item.id;
		}
	});

	$effect(() => {
		if (!showResult || !craftOutcome || !resultPanelEl) return;
		const prefersReducedMotion =
			typeof window !== 'undefined' &&
			window.matchMedia('(prefers-reduced-motion: reduce)').matches;
		requestAnimationFrame(() => {
			resultPanelEl?.scrollIntoView({
				behavior: prefersReducedMotion ? 'auto' : 'smooth',
				block: 'start'
			});
		});
	});

	function handleSlotSelect(slotId: string, instanceId: string) {
		slotSelections = { ...slotSelections, [slotId]: instanceId };
		// Hide result when inputs change
		showResult = false;
	}

	function handleTuningChange(propertyId: string, points: number) {
		tuning = { ...tuning, [propertyId]: points };
		// Hide result when inputs change
		showResult = false;
	}

	function handleModeChange(mode: CraftMode) {
		craftMode = mode;
		// Hide result when inputs change
		showResult = false;
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
		showResult = false;
		tuning = {};
		onCelebrateDismiss?.();
	}

	const handleSubmit: SubmitFunction = () => {
		crafting = true;
		return async ({ update }) => {
			// CRITICAL: reset: false prevents scroll jump; invalidateAll defaults to true so inventory refreshes
			await update({ reset: false });
			crafting = false;
			// Generate new key for next craft attempt
			idempotencyKey = generateIdempotencyKey();
		};
	};

	function formatBand(band: PropertyOutputBand): string {
		return band.replace(/_/g, ' ');
	}
</script>

<div class="craft-workbench">
	{#if showResult && craftOutcome}
		<div bind:this={resultPanelEl} class="result-panel flash flash--success" id="craft-result">
			<div class="result-header">
				<h3>You crafted: {craftOutcome.item.displayName}</h3>
				{#if craftOutcome.item.hasMinorFlaw}
					<span class="flaw-badge">Minor Flaw</span>
				{/if}
			</div>

			<div class="result-summary">
				<p class="summary-text">{craftOutcome.explanation.summary}</p>
				<p class="mode-text">{craftOutcome.explanation.modeContribution}</p>
			</div>

			<div class="property-results">
				{#each craftOutcome.explanation.properties as prop}
					<div class="property-result">
						<div class="result-line-header">
							<span class="prop-name">{prop.displayName}</span>
							<span class="prop-score {prop.finalBand}">
								{Math.round(prop.finalScore)} <span class="band-label">({prop.finalBand})</span>
							</span>
						</div>
						<div class="result-breakdown">
							<span class="breakdown-base">Base {Math.round(prop.baseScore)}</span>
							{#if prop.tuningPoints > 0}
								<span class="breakdown-arrow">→</span>
								<span class="breakdown-tuned">Tuned {Math.round(prop.tunedScore)}</span>
								<span class="breakdown-tuning">(+{prop.tuningPoints}pt)</span>
							{/if}
							{#if prop.finalScore !== prop.tunedScore}
								<span class="breakdown-arrow">→</span>
								<span class="breakdown-final">Final {Math.round(prop.finalScore)}</span>
							{/if}
						</div>
						<div class="top-driver">
							Top driver: {prop.drivers[0]?.label} ({prop.drivers[0]?.statValue}, {prop.drivers[0]?.weightPercent}% weight)
						</div>
					</div>
				{/each}
			</div>

			<div class="condition-display">
				Condition {craftOutcome.item.condition}% · Integrity {craftOutcome.item.integrity}%
			</div>

			<div class="result-actions">
				{#if equipTarget.kind !== 'none' && craftOutcome && onEquipCrafted}
					<form method="POST" action={equipTarget.action} use:enhance={onEquipCrafted}>
						<input type="hidden" name="itemId" value={craftOutcome.item.id} />
						{#if equipTarget.kind === 'thumper_part'}
							<input type="hidden" name="slot" value={equipTarget.slot} />
						{/if}
						<button type="submit" class="equip-now-btn">Equip this item</button>
					</form>
				{:else}
					<p class="result-note">This item goes to inventory — equip it from Gear + Repair below.</p>
				{/if}
				<button type="button" class="craft-another-btn" onclick={craftAnother}>
					Craft another
				</button>
			</div>
		</div>
	{:else if !schematicReadiness.craftableNow}
		<div class="blockers-panel" role="alert">
			<h3>Can't craft yet</h3>
			<ul class="blockers-list">
				{#each schematicReadiness.blockers as blocker}
					<li>{blocker}</li>
				{/each}
			</ul>
			<p class="blockers-actions">
				<a href="/survey">Go to Survey →</a>
				·
				<a href="/">Pilot Home →</a>
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

				{#each schematic.slots as slot}
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
						<span class="mode-title">Careful Experiment</span>
						<span class="mode-stakes">75% chance: +3% on every line. 5% risk: minor flaw.</span>
						<span class="mode-ceiling">Never exceeds resource ceiling</span>
					</button>
				</div>
				<input type="hidden" name="craftMode" value={craftMode} />
			</section>

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
	.craft-workbench {
		background: var(--surface-raised, #1a1a1a);
		border: 1px solid var(--border-subtle, #2e2e2e);
		border-radius: 8px;
		padding: 1rem;
	}

	.blockers-panel {
		padding: 1rem;
		border: 2px solid var(--accent-danger-border);
		border-radius: 8px;
		background: var(--accent-danger-bg);
	}

	.blockers-panel h3 {
		margin: 0 0 0.75rem;
		color: var(--accent-danger);
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
		background: var(--surface-inset);
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
		background: var(--surface-raised);
		color: var(--text-primary);
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.mode-btn:hover {
		border-color: var(--accent-info);
		background: var(--accent-info-bg);
	}

	.mode-btn.selected {
		border-color: var(--accent-info);
		background: var(--accent-info-bg);
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
		background: var(--accent-info);
		color: var(--surface-base);
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
		background: var(--surface-inset);
	}

	/* Result Panel */
	.result-panel {
		border-width: 2px;
	}

	.result-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.result-header h3 {
		margin: 0;
		font-size: 1.15rem;
	}

	.flaw-badge {
		font-size: 0.75rem;
		text-transform: uppercase;
		padding: 0.25rem 0.5rem;
		background: var(--accent-danger);
		color: var(--surface-base);
		border-radius: 4px;
		font-weight: 600;
	}

	.result-summary {
		background: var(--accent-success-bg);
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		border: 1px solid rgba(74, 222, 128, 0.3);
	}

	.summary-text {
		margin: 0 0 0.5rem 0;
		font-weight: 500;
		color: var(--accent-success-text);
	}

	.mode-text {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.property-results {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.property-result {
		background: var(--surface-raised);
		padding: 0.75rem;
		border-radius: 6px;
		border: 1px solid var(--border-subtle);
	}

	.result-line-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.prop-name {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.prop-score {
		font-weight: 700;
		text-transform: uppercase;
		font-size: 0.85rem;
	}

	.band-label {
		text-transform: lowercase;
		font-weight: 500;
		opacity: 0.8;
	}

	.prop-score.poor { color: var(--text-muted); }
	.prop-score.basic { color: var(--text-secondary); }
	.prop-score.solid { color: var(--accent-warning); }
	.prop-score.strong { color: var(--accent-success); }
	.prop-score.excellent { color: var(--accent-info); }
	.prop-score.exceptional { color: #a78bfa; }

	.result-breakdown {
		display: flex;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: var(--text-muted);
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}

	.breakdown-base {
		color: var(--text-muted);
	}

	.breakdown-arrow {
		color: var(--border-muted);
	}

	.breakdown-tuned {
		color: var(--accent-info);
		font-weight: 500;
	}

	.breakdown-tuning {
		color: var(--text-muted);
		font-size: 0.8rem;
	}

	.breakdown-final {
		color: var(--accent-success-text);
		font-weight: 600;
	}

	.top-driver {
		font-size: 0.8rem;
		color: var(--text-muted);
		font-style: italic;
	}

	.condition-display {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: var(--surface-inset);
		border-radius: 4px;
		border: 1px solid var(--border-subtle);
	}

	.result-panel {
		scroll-margin-top: 1rem;
	}

	.result-actions {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.result-actions form {
		display: flex;
		flex: 1;
	}

	.result-note {
		margin: 0;
		font-size: 0.9rem;
		color: var(--text-secondary);
	}

	.equip-now-btn {
		width: 100%;
		padding: 0.875rem;
		background: var(--accent-success, #22c55e);
		color: #0f0f0f;
		border: none;
		border-radius: 6px;
		font-size: 0.95rem;
		cursor: pointer;
		font-weight: 600;
	}

	.equip-now-btn:hover {
		filter: brightness(1.08);
	}

	.craft-another-btn {
		width: 100%;
		padding: 0.875rem;
		background: var(--surface-hover);
		color: var(--text-primary);
		border: 1px solid var(--border-subtle);
		border-radius: 6px;
		font-size: 0.95rem;
		cursor: pointer;
		transition: background 0.15s ease;
		font-weight: 500;
	}

	.craft-another-btn:hover {
		background: var(--surface-inset);
	}

	@media (min-width: 480px) {
		.result-actions {
			flex-direction: row;
		}

		.equip-now-btn,
		.craft-another-btn {
			flex: 1;
		}
	}

	@media (min-width: 640px) {
		.mode-options {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
