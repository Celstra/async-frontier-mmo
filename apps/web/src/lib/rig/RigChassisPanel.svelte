<script lang="ts">
	import type { RigEquippedPart } from '$lib/server/rigLoad';
	import ThumperAsciiPre from './ThumperAsciiPre.svelte';
	import { buildThumperAscii, thumperSlotsFromRigParts } from './thumperAscii';
	import WearBar from './WearBar.svelte';

	interface Props {
		maxRunLine: string;
		hullIntegrity: number | null;
		equippedParts: RigEquippedPart[];
		repairDebtLine: string | null;
	}

	let { maxRunLine, hullIntegrity, equippedParts, repairDebtLine }: Props = $props();

	const chassisAscii = $derived(
		buildThumperAscii({
			mode: 'rig',
			showProspectorScale: true,
			...thumperSlotsFromRigParts(equippedParts),
			footer: maxRunLine
		})
	);
</script>

<div class="chassis panel">
	<ThumperAsciiPre art={chassisAscii} />

	{#if hullIntegrity !== null}
		<p class="chassis__hull">Hull integrity {hullIntegrity}%</p>
	{/if}

	{#if repairDebtLine}
		<p class="chassis__debt">{repairDebtLine}</p>
	{/if}

	<div class="chassis__wear">
		{#each equippedParts as part (part.slot)}
			{#if part.itemId}
				<div class="chassis__wear-slot">
					<p class="chassis__wear-name">{part.slotLabel}: {part.displayName}</p>
					<WearBar
						kind="condition"
						label="Condition"
						value={part.condition ?? 0}
						ceiling={part.integrity ?? 100}
					/>
					<WearBar kind="integrity" label="Integrity" value={part.integrity ?? 0} />
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.chassis__hull {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.chassis__debt {
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.75rem;
		border-left: 2px solid var(--accent-warning-dim);
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		background: var(--bg-inset);
	}

	.chassis__wear {
		display: grid;
		gap: 0.75rem;
	}

	.chassis__wear-slot {
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.chassis__wear-name {
		margin: 0 0 0.45rem;
		font-size: var(--font-size-xs);
		color: var(--text-primary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}
</style>
