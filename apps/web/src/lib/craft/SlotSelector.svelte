<script lang="ts">
	import { previewCraftProperties, type CraftPropertyPreview, type ResourceFamily, type SchematicSlotFill, type TuningAllocation, type SchematicDefinition, type SchematicSlotDefinition } from '@async-frontier-mmo/domain';

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
		slot: SchematicSlotDefinition;
		stacks: InventoryStack[];
		hints: AllocationHint[];
		selectedInstanceId: string | null;
		onSelect: (instanceId: string) => void;
		// Live preview data for delta calculation
		currentSlotFills?: SchematicSlotFill[] | null;
		tuning?: TuningAllocation;
		livePreview?: CraftPropertyPreview | null;
	}

	let { schematic, slot, stacks, hints, selectedInstanceId, onSelect, currentSlotFills, tuning = {}, livePreview }: Props = $props();

	// Determine which stats actually matter for this slot by examining property weights
	function getRelevantStatsForSlot(schematic: SchematicDefinition, slotId: string): Array<{ stat: string; weightPercent: number; propertyName: string }> {
		const relevant: Array<{ stat: string; weightPercent: number; propertyName: string }> = [];
		
		for (const property of schematic.properties) {
			for (const term of property.terms) {
				if (term.kind === 'slot_stat' && term.slotId === slotId) {
					relevant.push({
						stat: term.stat,
						weightPercent: Math.round(term.weight * 100),
						propertyName: property.displayName
					});
				}
			}
		}
		
		// Sort by weight descending
		return relevant.sort((a, b) => b.weightPercent - a.weightPercent);
	}

	const relevantStats = $derived(getRelevantStatsForSlot(schematic, slot.id));
	
	// Get unique stats (deduplicated) for display
	const primaryStats = $derived(() => {
		const seen = new Set<string>();
		return relevantStats.filter(r => {
			if (seen.has(r.stat)) return false;
			seen.add(r.stat);
			return true;
		}).slice(0, 3); // Show top 3 unique stats
	});

	function getStatValue(stack: InventoryStack, stat: string): number {
		return stack.stats[stat as keyof typeof stack.stats] ?? 0;
	}

	function getStatBand(value: number): string {
		if (value >= 900) return 'exceptional';
		if (value >= 800) return 'excellent';
		if (value >= 650) return 'strong';
		if (value >= 500) return 'solid';
		if (value >= 250) return 'weak';
		return 'poor';
	}

	function getHintForStack(instanceId: string): AllocationHint | undefined {
		return hints.find(h => h.resourceInstanceId === instanceId);
	}

	// Check if stack has sufficient quantity
	function hasEnoughQuantity(stack: InventoryStack): boolean {
		return stack.quantity >= slot.inputQuantity;
	}

	// Build hypothetical slot fills replacing this slot with the given stack
	function buildHypotheticalFills(stack: InventoryStack): SchematicSlotFill[] | null {
		if (!currentSlotFills) return null;

		// Check if all other slots are filled
		const otherSlotsFilled = schematic.slots.every(s => {
			if (s.id === slot.id) return true;
			return currentSlotFills!.some(f => f.slotId === s.id);
		});
		if (!otherSlotsFilled) return null;

		return schematic.slots.map(s => {
			if (s.id === slot.id) {
				return {
					slotId: slot.id,
					resourceSlug: stack.resourceSlug,
					resourceDisplayName: stack.displayName,
					family: stack.family as ResourceFamily,
					stats: { ...stack.stats }
				};
			}
			return currentSlotFills!.find(f => f.slotId === s.id)!;
		});
	}

	// Get properties affected by this slot with their weight
	function getAffectedProperties(): Array<{ propertyId: string; propertyName: string; weightPercent: number }> {
		return schematic.properties
			.map(p => {
				const slotTerm = p.terms.find(t => t.kind === 'slot_stat' && t.slotId === slot.id);
				return {
					propertyId: p.id,
					propertyName: p.displayName,
					weightPercent: slotTerm ? Math.round(slotTerm.weight * 100) : 0
				};
			})
			.filter(p => p.weightPercent > 0)
			.sort((a, b) => b.weightPercent - a.weightPercent);
	}

	// Calculate preview for a specific stack to show what-if values
	function getStackPreview(stack: InventoryStack): CraftPropertyPreview | null {
		const fills = buildHypotheticalFills(stack);
		if (!fills) return null;
		try {
			return previewCraftProperties(schematic, fills, tuning);
		} catch {
			return null;
		}
	}

	// Get current preview values for comparison
	const currentPreview = $derived(livePreview);

	// Get affected properties list
	const affectedProperties = $derived(getAffectedProperties());

	// Find the preview line for a property
	function getPreviewLine(preview: CraftPropertyPreview, propertyId: string) {
		return preview.lines.find(l => l.propertyId === propertyId);
	}

	function formatDelta(current: number, hypothetical: number): string {
		const diff = Math.round(hypothetical - current);
		if (diff > 0) return `+${diff}`;
		if (diff < 0) return `${diff}`;
		return '·';
	}

	function getDeltaClass(current: number, hypothetical: number): string {
		const diff = Math.round(hypothetical - current);
		if (diff > 0) return 'positive';
		if (diff < 0) return 'negative';
		return 'neutral';
	}

	// For non-selected stacks, show what WOULD change if selected
	// For selected stack, show current values
	const showComparison = $derived(currentSlotFills != null && currentSlotFills.length > 0);
</script>

<div class="slot-selector">
	<div class="slot-header">
		<h4>{slot.displayName}</h4>
		<span class="family-tag">{slot.requiredFamily.replace('_', ' ')}</span>
		<span class="quantity-req">×{slot.inputQuantity}</span>
	</div>

	{#if stacks.length === 0}
		<p class="no-stacks">No {slot.requiredFamily.replace('_', ' ')} resources available. Survey and claim first.</p>
	{:else}
		<div class="stack-cards">
			{#each stacks as stack}
				{@const hint = getHintForStack(stack.resourceInstanceId)}
				{@const hasEnough = hasEnoughQuantity(stack)}
				{@const isSelected = selectedInstanceId === stack.resourceInstanceId}
				<button
					type="button"
					class="stack-card"
					class:selected={isSelected}
					class:insufficient={!hasEnough}
					disabled={!hasEnough}
					onclick={() => hasEnough && onSelect(stack.resourceInstanceId)}
				>
					<div class="card-header">
						<span class="stack-name">{stack.displayName}</span>
						<span class="stack-qty" class:insufficient={!hasEnough}>
							{stack.quantity} / {slot.inputQuantity}
						</span>
					</div>

					{#if !hasEnough}
						<p class="insufficient-reason">Not enough quantity</p>
					{/if}

					<div class="stat-row">
						{#each primaryStats() as relevant}
							{@const value = getStatValue(stack, relevant.stat)}
							<div class="stat-pill" class:highlight={isSelected}>
								<span class="stat-name">{relevant.stat.replace('_', ' ')}</span>
								<span class="stat-value {getStatBand(value)}">{value}</span>
								{#if relevant.weightPercent >= 40}
									<span class="weight-badge">{relevant.weightPercent}%</span>
								{/if}
							</div>
						{/each}
					</div>

					{#if hint}
						<div class="hint-row">
							<span class="hint-best">Best: {hint.bestUse}</span>
							{#if hint.otherUses.length > 0}
								<span class="hint-also">Also: {hint.otherUses.join(', ')}</span>
							{/if}
						</div>
					{/if}

					{#if showComparison && affectedProperties.length > 0}
						{@const stackPreview = getStackPreview(stack)}
						{#if stackPreview}
							<div class="comparison-row">
								<span class="comparison-label">If selected:</span>
								<div class="comparison-chips">
									{#each affectedProperties.slice(0, 2) as affected}
										{@const currentLine = currentPreview ? getPreviewLine(currentPreview, affected.propertyId) : null}
										{@const stackLine = getPreviewLine(stackPreview, affected.propertyId)}
										{#if currentLine && stackLine}
											{#if isSelected}
												<span class="chip current">
													{affected.propertyName}: {Math.round(currentLine.tunedScore)}
												</span>
											{:else}
												{@const deltaClass = getDeltaClass(currentLine.tunedScore, stackLine.tunedScore)}
												<span class="chip {deltaClass}">
													{affected.propertyName}: {Math.round(currentLine.tunedScore)} → {Math.round(stackLine.tunedScore)}
													<span class="delta">({formatDelta(currentLine.tunedScore, stackLine.tunedScore)})</span>
												</span>
											{/if}
										{/if}
									{/each}
								</div>
							</div>
						{/if}
					{/if}
				</button>
			{/each}
		</div>
	{/if}
</div>

<style>
	.slot-selector {
		margin: 1rem 0;
	}

	.slot-header {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		margin-bottom: 0.75rem;
	}

	.slot-header h4 {
		margin: 0;
		font-size: 1rem;
	}

	.family-tag {
		font-size: 0.75rem;
		text-transform: uppercase;
		color: #666;
		background: #f0f0f0;
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
	}

	.quantity-req {
		font-size: 0.85rem;
		color: #444;
		font-weight: 500;
	}

	.no-stacks {
		color: #666;
		font-style: italic;
		padding: 1rem;
		background: #f5f5f5;
		border-radius: 4px;
	}

	.stack-cards {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.stack-card {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		text-align: left;
		padding: 0.75rem;
		border: 2px solid #ddd;
		border-radius: 6px;
		background: white;
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
		font-size: inherit;
	}

	.stack-card:hover:not(:disabled) {
		border-color: #4a90d9;
		background: #f8fbff;
	}

	.stack-card.selected {
		border-color: #2c5aa0;
		background: #eef4fc;
		box-shadow: 0 2px 4px rgba(44, 90, 160, 0.15);
	}

	.stack-card.insufficient {
		opacity: 0.6;
		cursor: not-allowed;
		background: #fafafa;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.stack-name {
		font-weight: 600;
		font-size: 0.95rem;
	}

	.stack-qty {
		font-size: 0.85rem;
		color: #444;
	}

	.stack-qty.insufficient {
		color: #c00;
		font-weight: 500;
	}

	.insufficient-reason {
		font-size: 0.8rem;
		color: #c00;
		margin: 0 0 0.5rem 0;
		font-style: italic;
	}

	.stat-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
		margin-bottom: 0.5rem;
	}

	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.5rem;
		background: #f5f5f5;
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.stat-pill.highlight {
		background: #dbe6f7;
	}

	.stat-name {
		color: #666;
		text-transform: capitalize;
	}

	.stat-value {
		font-weight: 600;
	}

	.stat-value.exceptional { color: #7b2cbf; }
	.stat-value.excellent { color: #2c5aa0; }
	.stat-value.strong { color: #2d7d46; }
	.stat-value.solid { color: #b35900; }
	.stat-value.weak { color: #666; }
	.stat-value.poor { color: #999; }

	.weight-badge {
		font-size: 0.7rem;
		background: #4a90d9;
		color: white;
		padding: 0.1rem 0.3rem;
		border-radius: 3px;
		font-weight: 500;
	}

	.hint-row {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		font-size: 0.75rem;
		padding-top: 0.4rem;
		border-top: 1px solid #eee;
	}

	.hint-best {
		color: #2d7d46;
		font-weight: 500;
	}

	.hint-also {
		color: #666;
	}

	.comparison-row {
		display: flex;
		flex-direction: column;
		gap: 0.35rem;
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px dashed #ddd;
	}

	.comparison-label {
		font-size: 0.7rem;
		color: #888;
		text-transform: uppercase;
		font-weight: 500;
	}

	.comparison-chips {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.chip {
		font-size: 0.75rem;
		padding: 0.2rem 0.4rem;
		border-radius: 4px;
		background: #f5f5f5;
		border: 1px solid #e0e0e0;
		color: #555;
	}

	.chip.current {
		background: #d4edda;
		border-color: #28a745;
		color: #155724;
	}

	.chip.positive {
		background: #d4edda;
		border-color: #28a745;
		color: #155724;
	}

	.chip.negative {
		background: #f8d7da;
		border-color: #dc3545;
		color: #721c24;
	}

	.chip.neutral {
		background: #f8f9fa;
		border-color: #dee2e6;
		color: #6c757d;
	}

	.chip .delta {
		font-weight: 600;
		margin-left: 0.15rem;
	}

	@media (min-width: 640px) {
		.stack-cards {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		}
	}
</style>
