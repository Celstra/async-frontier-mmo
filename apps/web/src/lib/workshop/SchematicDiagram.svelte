<script lang="ts">
	import { THUMPER_CHASSIS_ASSEMBLY } from '@async-frontier-mmo/domain';
	import ThumperAsciiPre from '$lib/rig/ThumperAsciiPre.svelte';
	import { buildThumperAscii, type ThumperAsciiSlot } from '$lib/rig/thumperAscii';

	interface SlotLabel {
		id: string;
		displayName: string;
	}

	interface Props {
		title: string;
		slots: SlotLabel[];
		activeSlotId?: string | null;
		variant?: 'craft' | 'chassis';
		assemblySlots?: {
			hull?: ThumperAsciiSlot;
			drill?: ThumperAsciiSlot;
			pump?: ThumperAsciiSlot;
		};
	}

	let { title, slots, activeSlotId = null, variant = 'craft', assemblySlots }: Props = $props();

	const isChassis = $derived(variant === 'chassis' || title === THUMPER_CHASSIS_ASSEMBLY.displayName);

	const chassisAscii = $derived(
		buildThumperAscii({
			mode: 'workshop',
			showProspectorScale: true,
			header: title,
			hull: assemblySlots?.hull ?? { equipped: false },
			drill: assemblySlots?.drill ?? { equipped: false },
			pump: assemblySlots?.pump ?? { equipped: false }
		})
	);
</script>

<div class="diagram panel" aria-hidden="true">
	{#if isChassis}
		<ThumperAsciiPre art={chassisAscii} />
	{:else}
	<pre class="diagram__ascii">
      ___[ {title.toUpperCase()} ]___
     /    SCHEMATIC DIAGRAM       \
    {#each slots as slot, index}
    |  ({index + 1}) {slot.displayName.toUpperCase().padEnd(18, ' ')} |
    {/each}
     \___________________________/</pre>
	{/if}
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
