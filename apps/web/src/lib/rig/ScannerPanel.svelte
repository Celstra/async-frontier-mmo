<script lang="ts">
	import { enhance } from '$app/forms';
	import type { RigScannerCandidate } from '$lib/server/rigLoad';
	import WearBar from './WearBar.svelte';

	interface Props {
		equippedScanner: {
			displayName: string;
			condition: number;
			integrity: number;
			surveyClarity: number;
	} | null;
	candidates: RigScannerCandidate[];
	repairKitCount: number;
	locked?: boolean;
}

let { equippedScanner, candidates, repairKitCount, locked = false }: Props = $props();
</script>

<section class="scanner panel">
	<h2 class="panel__title">Survey scanner</h2>

	{#if equippedScanner}
		<div class="scanner__equipped panel-inset">
			<p class="scanner__name">{equippedScanner.displayName}</p>
			<p class="scanner__clarity">Survey Clarity {equippedScanner.surveyClarity.toFixed(1)}</p>
			<WearBar
				kind="condition"
				label="Condition"
				value={equippedScanner.condition}
				ceiling={equippedScanner.integrity}
			/>
			<WearBar kind="integrity" label="Integrity" value={equippedScanner.integrity} />
		</div>
	{:else}
		<p class="scanner__empty">No scanner equipped — pick one below or craft in WORKSHOP.</p>
	{/if}

	<ul class="scanner__list">
		{#each candidates as candidate (candidate.itemId)}
			<li class="candidate">
				<div class="candidate__info">
					<span class="candidate__name">{candidate.displayName}</span>
					<span class="candidate__stats">
						Clarity {candidate.surveyClarity.toFixed(1)} · condition {candidate.condition}% · integrity
						{candidate.integrity}%
					</span>
				</div>
				<div class="candidate__actions">
					{#if !candidate.equipped}
						<form method="POST" action="?/equipScanner" use:enhance>
							<input type="hidden" name="itemId" value={candidate.itemId} />
<button type="submit" class="action-row" disabled={locked}>Equip</button>
						</form>
					{/if}
					{#if candidate.canRepair}
						<form method="POST" action="?/repairItem" use:enhance>
							<input type="hidden" name="itemId" value={candidate.itemId} />
<button type="submit" class="action-row action-row--repair" disabled={locked}>Repair</button>
						</form>
					{/if}
				</div>
			</li>
		{:else}
			<li class="scanner__empty">No crafted scanners yet.</li>
		{/each}
	</ul>

	{#if locked}
		<p class="scanner__hint">Equipment locked while thumper deployed.</p>
	{:else if repairKitCount === 0}
		<p class="scanner__hint">Field Repair kits: 0 — craft in WORKSHOP to repair gear.</p>
	{:else}
		<p class="scanner__hint">Field Repair kits: {repairKitCount}</p>
	{/if}
</section>

<style>
	.scanner__equipped {
		margin-bottom: 0.75rem;
		padding: 0.75rem;
		display: grid;
		gap: 0.45rem;
	}

	.scanner__name {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
	}

	.scanner__clarity {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.scanner__list {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.4rem;
	}

	.candidate {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.5rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.candidate__name {
		display: block;
		font-size: var(--font-size-sm);
	}

	.candidate__stats {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.candidate__actions {
		display: flex;
		gap: 0.35rem;
	}

	.action-row--repair {
		border-color: var(--accent-warning-dim);
		color: var(--accent-warning);
	}

	.scanner__empty,
	.scanner__hint {
		margin: 0.35rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}
</style>
