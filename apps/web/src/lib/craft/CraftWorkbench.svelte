<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '@sveltejs/kit';
	import {
		previewCraftProperties,
		resolveCraft,
		getPropertyOutputBand,
		type SchematicDefinition,
		type SchematicSlotFill,
		type TuningAllocation,
		type CraftPropertyPreview,
		FIRST_SCANNER_SUGGESTED_TUNING,
		FIELD_REPAIR_KIT,
		FIRST_REPAIR_KIT_SUGGESTED_TUNING,
		EFFICIENT_PUMP,
		REINFORCED_HULL_PLATE,
		BASIC_DRILL_HEAD,
		TUNING_POINTS_TOTAL,
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
	}

	let { schematic, inventory, allocationHints, defaultSelections = {}, craftOutcome }: Props = $props();

	// Client state - all pure client-side, no page reloads
	let slotSelections = $state<Record<string, string>>({});
	let tuning = $state<TuningAllocation>({});
	let craftMode = $state<CraftMode>('safe_craft');
	let idempotencyKey = $state(generateIdempotencyKey());
	let crafting = $state(false);
	let showResult = $state(false);
	let lastCraftedKey = $state<string | null>(null);

	// Track resource changes for delta animation
	let previousSlotFills = $state<SchematicSlotFill[] | null>(null);

	// Reset state when schematic changes (fixes state_referenced_locally warnings)
	$effect(() => {
		const schematicId = schematic.id;
		const selections = { ...defaultSelections };
		const defaultTuning = getDefaultTuning(schematicId);
		// Batch state updates
		slotSelections = selections;
		tuning = defaultTuning;
		showResult = false;
		// idempotencyKey and craftMode persist per-page-load intentionally
	});

	function generateIdempotencyKey(): string {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
	}

	function getDefaultTuning(schematicId: string): TuningAllocation {
		if (schematicId === 'survey_scanner_mk_i') return { ...FIRST_SCANNER_SUGGESTED_TUNING };
		if (schematicId === FIELD_REPAIR_KIT.id) return { ...FIRST_REPAIR_KIT_SUGGESTED_TUNING };
		if (schematicId === EFFICIENT_PUMP.id) return { recovery_efficiency: 2, clog_resistance: 1, field_stability: 0 };
		if (schematicId === BASIC_DRILL_HEAD.id) return { extraction_rate: 2, depth_access: 1, wear_control: 0 };
		if (schematicId === REINFORCED_HULL_PLATE.id) return { max_condition: 2, damage_reduction: 1, repairability: 0 };
		return {};
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
			if (stack.quantity < slot.inputQuantity) return null;

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

	// When form returns a craft outcome, show it inline
	$effect(() => {
		if (craftOutcome && craftOutcome.item.id !== lastCraftedKey) {
			showResult = true;
			lastCraftedKey = craftOutcome.item.id;
		}
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
		// Reset to default tuning for new craft
		tuning = getDefaultTuning(schematic.id);
	}

	const handleSubmit: SubmitFunction = () => {
		crafting = true;
		return async ({ update }) => {
			// CRITICAL: reset: false prevents scroll jump
			await update({ reset: false, invalidateAll: false });
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
		<div class="result-panel flash flash--success">
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

			<button type="button" class="craft-another-btn" onclick={craftAnother}>
				Craft Another {schematic.displayName}
			</button>
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
				<SlotSelector
					{schematic}
					{slot}
					{stacks}
					hints={allocationHints}
					selectedInstanceId={slotSelections[slot.id] ?? null}
					onSelect={(id) => handleSlotSelect(slot.id, id)}
					currentSlotFills={slotFills}
					{tuning}
					{livePreview}
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
					Spend exactly {TUNING_POINTS_TOTAL} tuning points ({getTotalTuningPoints()} used)
				{:else}
					Craft {schematic.displayName}
				{/if}
			</button>
		</form>
	{/if}
</div>

<style>
	.craft-workbench {
		background: white;
		border: 1px solid #ddd;
		border-radius: 8px;
		padding: 1rem;
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
		color: #666;
	}

	/* Craft Mode Section */
	.craft-mode-section {
		padding: 1rem;
		background: #f8f9fa;
		border-radius: 6px;
		border: 1px solid #e0e0e0;
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
		border: 2px solid #ddd;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		text-align: left;
		font-family: inherit;
		transition: all 0.15s ease;
	}

	.mode-btn:hover {
		border-color: #4a90d9;
		background: #f8fbff;
	}

	.mode-btn.selected {
		border-color: #2c5aa0;
		background: #eef4fc;
		box-shadow: 0 2px 4px rgba(44, 90, 160, 0.1);
	}

	.mode-title {
		font-weight: 600;
		font-size: 0.95rem;
		margin-bottom: 0.35rem;
	}

	.mode-stakes {
		font-size: 0.85rem;
		color: #444;
		margin-bottom: 0.25rem;
		line-height: 1.4;
	}

	.mode-ceiling {
		font-size: 0.75rem;
		color: #666;
		font-style: italic;
	}

	.craft-submit-btn {
		margin-top: 0.5rem;
		padding: 1rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		background: #2c5aa0;
		color: white;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.15s ease;
		min-height: 3rem;
	}

	.craft-submit-btn:hover:not(:disabled) {
		background: #1e3d6f;
	}

	.craft-submit-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
		background: #888;
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
		background: #dc3545;
		color: white;
		border-radius: 4px;
		font-weight: 600;
	}

	.result-summary {
		background: white;
		padding: 0.75rem;
		border-radius: 6px;
		margin-bottom: 1rem;
		border: 1px solid #d4edda;
	}

	.summary-text {
		margin: 0 0 0.5rem 0;
		font-weight: 500;
		color: #155724;
	}

	.mode-text {
		margin: 0;
		font-size: 0.85rem;
		color: #555;
	}

	.property-results {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
		margin-bottom: 1rem;
	}

	.property-result {
		background: white;
		padding: 0.75rem;
		border-radius: 6px;
		border: 1px solid #c3e6cb;
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

	.prop-score.poor { color: #666; }
	.prop-score.basic { color: #444; }
	.prop-score.solid { color: #b35900; }
	.prop-score.strong { color: #28a745; }
	.prop-score.excellent { color: #2c5aa0; }
	.prop-score.exceptional { color: #7b2cbf; }

	.result-breakdown {
		display: flex;
		gap: 0.5rem;
		font-size: 0.85rem;
		color: #666;
		margin-bottom: 0.25rem;
		flex-wrap: wrap;
	}

	.breakdown-base {
		color: #888;
	}

	.breakdown-arrow {
		color: #aaa;
	}

	.breakdown-tuned {
		color: #2c5aa0;
		font-weight: 500;
	}

	.breakdown-tuning {
		color: #666;
		font-size: 0.8rem;
	}

	.breakdown-final {
		color: #155724;
		font-weight: 600;
	}

	.top-driver {
		font-size: 0.8rem;
		color: #888;
		font-style: italic;
	}

	.condition-display {
		font-size: 0.9rem;
		color: #555;
		margin-bottom: 1rem;
		padding: 0.5rem;
		background: white;
		border-radius: 4px;
		border: 1px solid #d4edda;
	}

	.craft-another-btn {
		width: 100%;
		padding: 0.875rem;
		background: #6c757d;
		color: white;
		border: none;
		border-radius: 6px;
		font-size: 0.95rem;
		cursor: pointer;
		transition: background 0.15s ease;
		font-weight: 500;
	}

	.craft-another-btn:hover {
		background: #5a6268;
	}

	@media (min-width: 640px) {
		.mode-options {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
		}
	}
</style>
