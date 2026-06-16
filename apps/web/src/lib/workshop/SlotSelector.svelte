<script lang="ts">
	import {
		availableQuantityForSlot,
		canFillSlotWithStack,
		type SchematicSlotReadiness,
		type SchematicDefinition,
		type SchematicSlotDefinition
	} from '@async-frontier-mmo/domain';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import { WORKSHOP_SLICE_PLAYTEST } from '$lib/decision024';

	const MVP_STATS = [
		'OQ',
		'conductivity',
		'hardness',
		'heat_resistance',
		'malleability'
	] as const;

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
		slot: SchematicSlotDefinition;
		stacks: InventoryStack[];
		allSlotSelections: Record<string, string>;
		selectedInstanceId: string | null;
		onSelect: (instanceId: string) => void;
		slotReadiness?: SchematicSlotReadiness;
	}

	let {
		schematic,
		slot,
		stacks,
		allSlotSelections,
		selectedInstanceId,
		onSelect,
		slotReadiness
	}: Props = $props();

	function chooseStack(stack: InventoryStack) {
		if (!hasEnoughQuantity(stack)) {
			return;
		}
		onSelect(stack.resourceInstanceId);
	}

	function missingHintHref(): string | null {
		if (WORKSHOP_SLICE_PLAYTEST) {
			return null;
		}
		return '/field';
	}

	function formatStatLabel(stat: (typeof MVP_STATS)[number]): string {
		if (stat === 'OQ') return 'OQ';
		return stat.replace('_', ' ');
	}

	function getStatValue(stack: InventoryStack, stat: (typeof MVP_STATS)[number]): number {
		return stack.stats[stat] ?? 0;
	}

	function getStatBand(value: number): string {
		if (value >= 900) return 'exceptional';
		if (value >= 800) return 'excellent';
		if (value >= 650) return 'strong';
		if (value >= 500) return 'solid';
		if (value >= 250) return 'weak';
		return 'poor';
	}

	function availableForStack(stack: InventoryStack): number {
		return availableQuantityForSlot({
			schematic,
			slotSelections: allSlotSelections,
			slotId: slot.id,
			resourceInstanceId: stack.resourceInstanceId,
			stackQuantity: stack.quantity
		});
	}

	function hasEnoughQuantity(stack: InventoryStack): boolean {
		return canFillSlotWithStack({
			schematic,
			slotSelections: allSlotSelections,
			slotId: slot.id,
			resourceInstanceId: stack.resourceInstanceId,
			stackQuantity: stack.quantity
		});
	}
</script>

<div class="slot-selector">
	<div class="slot-header">
		<h4>{slot.displayName}</h4>
		<span class="family-tag">{familyDisplayLabel(slot.requiredFamily)}</span>
		<span class="quantity-req">×{slot.inputQuantity}</span>
	</div>

	{#if slotReadiness && !slotReadiness.satisfiable && slotReadiness.missing}
		<p class="slot-missing">
			Needs {slotReadiness.quantityNeeded} {slotReadiness.familyNeeded} —
			{slotReadiness.missing.sourceHint}
			{#if missingHintHref()}
				<a href={missingHintHref()}>Go →</a>
			{/if}
		</p>
	{/if}

	{#if stacks.length === 0}
		<p class="no-stacks">
			{WORKSHOP_SLICE_PLAYTEST
				? `No ${familyDisplayLabel(slot.requiredFamily)} bench stock available. Reclaim a crafted item or open a supply crate.`
				: `No ${familyDisplayLabel(slot.requiredFamily)} stacks available. Survey and claim first.`}
		</p>
	{:else}
		<div class="stack-cards">
			{#each stacks as stack}
				{@const hasEnough = hasEnoughQuantity(stack)}
				{@const isSelected = selectedInstanceId === stack.resourceInstanceId}
				<button
					type="button"
					class="stack-card"
					class:selected={isSelected}
					class:insufficient={!hasEnough}
					disabled={!hasEnough}
					data-testid={`workshop-stack-${slot.id}-${stack.resourceSlug}`}
					aria-pressed={isSelected}
					onclick={() => chooseStack(stack)}
				>
					<div class="card-header">
						<span class="stack-name">{stack.displayName}</span>
						<span class="stack-qty" class:insufficient={!hasEnough}>
							{availableForStack(stack)} / {slot.inputQuantity}
							{#if availableForStack(stack) < stack.quantity}
								<span class="reserved-note">({stack.quantity} in stack)</span>
							{/if}
						</span>
					</div>

					{#if !hasEnough}
						<p class="insufficient-reason">
							{#if availableForStack(stack) < stack.quantity && availableForStack(stack) > 0}
								{stack.quantity - availableForStack(stack)} reserved for another slot — need {slot.inputQuantity} here
							{:else}
								Not enough quantity — need {slot.inputQuantity} in one craft
							{/if}
						</p>
					{/if}

					<div class="stat-row">
						{#each MVP_STATS as stat}
							{@const value = getStatValue(stack, stat)}
							<div class="stat-pill" class:highlight={isSelected}>
								<span class="stat-name">{formatStatLabel(stat)}</span>
								<span class="stat-value {getStatBand(value)}">{value}</span>
							</div>
						{/each}
					</div>
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
		color: var(--text-muted);
		background: var(--bg-inset);
		padding: 0.15rem 0.4rem;
		border-radius: 3px;
	}

	.quantity-req {
		font-size: 0.85rem;
		color: var(--text-secondary);
		font-weight: 500;
	}

	.slot-missing {
		margin: 0 0 0.75rem;
		padding: 0.65rem 0.75rem;
		font-size: 0.85rem;
		line-height: 1.4;
		color: var(--text-secondary);
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.slot-missing a {
		white-space: nowrap;
		font-weight: 600;
	}

	.no-stacks {
		color: var(--text-muted, #9ca3af);
		font-style: italic;
		padding: 1rem;
		background: var(--bg-inset);
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
		border: 2px solid var(--border-subtle);
		border-radius: 6px;
		background: var(--bg-panel);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.15s ease;
		font-family: inherit;
		font-size: inherit;
	}

	.stack-card:hover:not(:disabled) {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
	}

	.stack-card.selected {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
		box-shadow: 0 2px 4px rgba(96, 165, 250, 0.15);
	}

	.stack-card.insufficient {
		opacity: 0.6;
		cursor: not-allowed;
		background: var(--bg-inset);
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
		color: var(--text-secondary);
	}

	.stack-qty.insufficient {
		color: var(--accent-danger);
		font-weight: 500;
	}

	.reserved-note {
		font-size: 0.75rem;
		color: var(--text-muted);
		font-weight: 400;
	}

	.insufficient-reason {
		font-size: 0.8rem;
		color: var(--accent-danger);
		margin: 0 0 0.5rem 0;
		font-style: italic;
	}

	.stat-row {
		display: flex;
		flex-wrap: wrap;
		gap: 0.4rem;
	}

	.stat-pill {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.25rem 0.5rem;
		background: var(--bg-inset);
		border-radius: 4px;
		font-size: 0.8rem;
	}

	.stat-pill.highlight {
		background: var(--phosphor-glow);
	}

	.stat-name {
		color: var(--text-muted);
		text-transform: capitalize;
	}

	.stat-value {
		font-weight: 600;
	}

	.stat-value.exceptional { color: #a78bfa; }
	.stat-value.excellent { color: var(--phosphor); }
	.stat-value.strong { color: var(--phosphor); }
	.stat-value.solid { color: var(--accent-warning); }
	.stat-value.weak { color: var(--text-muted); }
	.stat-value.poor { color: var(--text-muted); }

	@media (min-width: 640px) {
		.stack-cards {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
		}
	}
</style>
