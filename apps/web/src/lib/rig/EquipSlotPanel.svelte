<script lang="ts">
	import { enhance } from '$app/forms';
	import { hullIntegrityAdvisoryLine } from '@async-frontier-mmo/domain';
	import type { RigPartCandidate } from '$lib/server/rigLoad';

	interface Props {
		slotLabel: string;
	slot: 'drill' | 'pump' | 'hull';
	candidates: RigPartCandidate[];
	repairKitCount: number;
	locked?: boolean;
}

let { slotLabel, slot, candidates, repairKitCount, locked = false }: Props = $props();
	let open = $state(false);
</script>

<section class="equip-slot panel-inset">
	<button type="button" class="equip-slot__header" onclick={() => (open = !open)}>
		<span class="equip-slot__label">{slotLabel}</span>
		<span class="equip-slot__meta">{candidates.length} in inventory</span>
	</button>

	{#if open}
		<ul class="equip-slot__list">
			{#each candidates as candidate (candidate.itemId)}
				<li class="candidate">
					<div class="candidate__info">
						<span class="candidate__name">{candidate.displayName}</span>
						<span class="candidate__stats">
							condition {candidate.condition}% · integrity {candidate.integrity}%
							{#if candidate.equipped}
								· equipped
							{/if}
						</span>
						{#if slot === 'hull'}
							{@const hullAdvisory = hullIntegrityAdvisoryLine(candidate.integrity)}
							{#if hullAdvisory}
								<span class="candidate__hull-advisory">{hullAdvisory}</span>
							{/if}
						{/if}
					</div>
					<div class="candidate__actions">
						{#if !candidate.equipped}
							<form method="POST" action="?/equipThumperPart" use:enhance>
								<input type="hidden" name="slot" value={slot} />
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
				<li class="equip-slot__empty">No {slotLabel.toLowerCase()} parts — craft in WORKSHOP.</li>
			{/each}
		</ul>
		{#if locked}
			<p class="equip-slot__hint">Equipment locked while thumper deployed.</p>
		{:else if repairKitCount === 0}
			<p class="equip-slot__hint">No Field Repair kits — craft one in WORKSHOP to repair worn parts.</p>
		{/if}
	{/if}
</section>

<style>
	.equip-slot__header {
		width: 100%;
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.65rem 0.75rem;
		border: none;
		background: transparent;
		color: var(--text-primary);
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		text-align: left;
		cursor: pointer;
	}

	.equip-slot__header:hover {
		color: var(--phosphor);
	}

	.equip-slot__label {
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.equip-slot__meta {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.equip-slot__list {
		list-style: none;
		margin: 0;
		padding: 0.35rem 0.5rem 0.5rem;
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
		background: var(--bg-panel);
	}

	.candidate__info {
		min-width: 10rem;
	}

	.candidate__name {
		display: block;
		font-size: var(--font-size-sm);
		color: var(--text-bright);
	}

	.candidate__stats {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.candidate__hull-advisory {
		display: block;
		margin-top: 0.2rem;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.candidate__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.action-row--repair {
		border-color: var(--accent-warning-dim);
		color: var(--accent-warning);
	}

	.equip-slot__empty,
	.equip-slot__hint {
		margin: 0;
		padding: 0.5rem 0.65rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}
</style>
