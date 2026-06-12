<script lang="ts">
	import { THUMPER_CHASSIS_ASSEMBLY } from '@async-frontier-mmo/domain';

	interface SlotLabel {
		id: string;
		displayName: string;
	}

	interface Props {
		title: string;
		slots: SlotLabel[];
		activeSlotId?: string | null;
		variant?: 'craft' | 'chassis';
	}

	let { title, slots, activeSlotId = null, variant = 'craft' }: Props = $props();

	const isChassis = $derived(variant === 'chassis' || title === THUMPER_CHASSIS_ASSEMBLY.displayName);
</script>

<div class="diagram panel" aria-hidden="true">
	<pre class="diagram__ascii">
{#if isChassis}
      ___[ {title.toUpperCase()} ]___
     /                         \
    |  [ HULL ]                 |
    |    +-------+-------+      |
    |    | DRILL | PUMP  |      |
     \_________________________/
{:else}
      ___[ {title.toUpperCase()} ]___
     /    SCHEMATIC DIAGRAM       \
    {#each slots as slot, index}
    |  ({index + 1}) {slot.displayName.toUpperCase().padEnd(18, ' ')} |
    {/each}
     \___________________________/
{/if}</pre>
	<ul class="diagram__legend">
		{#each slots as slot (slot.id)}
			<li class:diagram__legend-item--active={activeSlotId === slot.id}>
				{slot.displayName}
			</li>
		{/each}
	</ul>
</div>

<style>
	.diagram {
		padding: 0.85rem 1rem;
		background: var(--bg-inset);
		border-color: var(--border-subtle);
	}

	.diagram__ascii {
		margin: 0 0 0.65rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: 1.35;
		color: var(--phosphor);
		white-space: pre;
		overflow-x: auto;
	}

	.diagram__legend {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.65rem;
		list-style: none;
		margin: 0;
		padding: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.diagram__legend-item--active {
		color: var(--phosphor);
	}
</style>
