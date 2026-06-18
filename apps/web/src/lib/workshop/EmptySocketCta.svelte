<script lang="ts">
	import type { SchematicDefinition } from '@async-frontier-mmo/domain';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import {
		assemblySlotLayout,
		assemblySlotPlacementLabel
	} from './schematicArt';
	import { schematicSlotPosition } from './workshopSlotFlow';
	import { postWorkshopUxTelemetry } from './postWorkshopUxTelemetry';

	type SchematicSlot = SchematicDefinition['slots'][number];

	interface Props {
		schematic: SchematicDefinition;
		nextEmptySlot: SchematicSlot | null;
		onOpenSlot: (slotId: string, trigger: HTMLElement) => void;
	}

	let { schematic, nextEmptySlot, onOpenSlot }: Props = $props();

	const slotPosition = $derived(
		nextEmptySlot ? schematicSlotPosition(schematic, nextEmptySlot.id) : null
	);
	const slotTotal = $derived(schematic.slots.length);
	const diagramHint = $derived.by(() => {
		if (!nextEmptySlot) return null;
		const index = schematic.slots.findIndex((slot) => slot.id === nextEmptySlot.id);
		const placement = assemblySlotLayout(schematic.id, nextEmptySlot.id, Math.max(index, 0)).placement;
		return assemblySlotPlacementLabel(placement);
	});
	const diagramSlotId = $derived(
		nextEmptySlot ? `assembly-slot-${nextEmptySlot.id}` : undefined
	);
</script>

<section
	class="empty-socket-cta"
	id="workshop-step-load-slots"
	aria-label="Assembly slot guidance"
	data-testid="empty-socket-cta"
>
	{#if nextEmptySlot && slotPosition && diagramHint}
		<button
			type="button"
			class="empty-socket-cta__action"
			data-testid="empty-socket-cta-button"
			aria-describedby={diagramSlotId}
			onclick={(event) => {
				void postWorkshopUxTelemetry('first_socket_cta_clicked', {
					schematicId: schematic.id,
					slotId: nextEmptySlot.id
				});
				onOpenSlot(nextEmptySlot.id, event.currentTarget as HTMLButtonElement);
			}}
		>
			<span class="empty-socket-cta__step">
				Step 2/5 — Load {nextEmptySlot.displayName}
				<span class="empty-socket-cta__position">(socket {slotPosition} of {slotTotal})</span>
			</span>
			<span class="empty-socket-cta__headline">This socket is empty.</span>
			<span class="empty-socket-cta__detail">
				<span class="empty-socket-cta__diagram-hint">{diagramHint}</span>
				<span class="empty-socket-cta__family">
					Needs {familyDisplayLabel(nextEmptySlot.requiredFamily)}.
				</span>
			</span>
			<span class="empty-socket-cta__hint">
				Look for the highlighted <strong>{nextEmptySlot.displayName}</strong> box above, or tap here
				to choose bench stock
			</span>
		</button>
	{:else}
		<p class="empty-socket-cta__ready">
			Slots loaded. Tune the result you care about, then craft or experiment.
		</p>
	{/if}
</section>

<style>
	.empty-socket-cta {
		margin: 0 0 1rem;
		scroll-margin-top: 0.75rem;
	}

	.empty-socket-cta__action {
		display: grid;
		gap: 0.35rem;
		width: 100%;
		padding: 1rem 1.05rem;
		border: 2px solid var(--accent-warning);
		border-radius: var(--radius-md);
		background:
			linear-gradient(180deg, rgba(255, 176, 32, 0.1) 0%, rgba(10, 12, 10, 0.92) 55%),
			var(--bg-panel);
		color: var(--text-primary);
		font: inherit;
		text-align: left;
		cursor: pointer;
		box-shadow: 0 0 18px rgba(255, 176, 32, 0.12);
		transition:
			border-color 120ms ease,
			box-shadow 120ms ease,
			transform 120ms ease;
	}

	.empty-socket-cta__action:hover {
		border-color: var(--phosphor);
		box-shadow: 0 0 20px var(--phosphor-glow);
		transform: translateY(-1px);
	}

	.empty-socket-cta__action:focus-visible {
		outline: 2px solid var(--phosphor);
		outline-offset: 3px;
	}

	.empty-socket-cta__step {
		color: var(--accent-warning);
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.empty-socket-cta__position {
		color: var(--text-bright);
		letter-spacing: 0.06em;
	}

	.empty-socket-cta__headline {
		color: var(--text-bright);
		font-size: var(--font-size-lg);
		font-weight: 700;
		line-height: 1.25;
	}

	.empty-socket-cta__detail {
		display: grid;
		gap: 0.2rem;
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		line-height: 1.45;
	}

	.empty-socket-cta__diagram-hint {
		color: var(--phosphor);
		font-weight: 600;
		text-transform: capitalize;
	}

	.empty-socket-cta__family {
		color: var(--text-secondary);
	}

	.empty-socket-cta__hint {
		margin-top: 0.15rem;
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		line-height: 1.45;
	}

	.empty-socket-cta__hint strong {
		color: var(--accent-warning);
		font-weight: 700;
	}

	.empty-socket-cta__ready {
		margin: 0;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--phosphor-dim);
		border-radius: var(--radius-md);
		background: var(--phosphor-glow);
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		line-height: 1.45;
	}
</style>
