<script lang="ts">
	import type { RigEquippedPart } from '$lib/server/rigLoad';
	import WearBar from './WearBar.svelte';

	interface Props {
		maxRunLine: string;
		hullIntegrity: number | null;
		equippedParts: RigEquippedPart[];
		repairDebtLine: string | null;
	}

	let { maxRunLine, hullIntegrity, equippedParts, repairDebtLine }: Props = $props();

	const drill = $derived(equippedParts.find((part) => part.slot === 'drill'));
	const pump = $derived(equippedParts.find((part) => part.slot === 'pump'));
	const hull = $derived(equippedParts.find((part) => part.slot === 'hull'));

	function slotLabel(name: string | null | undefined, width: number): string {
		return (name?.slice(0, width).toUpperCase() ?? '— EMPTY —').padEnd(width, ' ');
	}

	const chassisAscii = $derived(
		[
			'      ___[ THUMPER RIG ]___',
			'     /                   \\',
			`    | HULL ${slotLabel(hull?.displayName, 14)} |`,
			`    |  DRILL ${slotLabel(drill?.displayName, 10)} |`,
			`    |  PUMP  ${slotLabel(pump?.displayName, 10)} |`,
			'     \\___________________/'
		].join('\n')
	);
</script>

<div class="chassis panel">
	<pre class="chassis__ascii" aria-hidden="true">{chassisAscii}</pre>

	<p class="chassis__ceiling">{maxRunLine}</p>
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
					<WearBar label="Condition" value={part.condition ?? 0} />
					<WearBar label="Integrity" value={part.integrity ?? 0} />
				</div>
			{/if}
		{/each}
	</div>
</div>

<style>
	.chassis__ascii {
		margin: 0 0 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: 1.35;
		color: var(--phosphor);
		white-space: pre;
		overflow-x: auto;
	}

	.chassis__ceiling {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
		letter-spacing: 0.04em;
		text-transform: uppercase;
	}

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
