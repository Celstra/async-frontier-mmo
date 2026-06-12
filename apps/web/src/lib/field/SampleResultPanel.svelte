<script lang="ts">
	import { FIELD_STAT_ROWS, type FieldResourceStats } from '$lib/field/resourceStats';

	interface Props {
		resourceDisplayName: string;
		trickleQuantity: number;
		trueConcentrationPercent: number;
		energyCost: number;
		surveyEnergyAfter: number;
		surveyEnergyCap: number;
		statsRevealedThisSample: boolean;
		yieldBandLabel: string;
		stats: FieldResourceStats | null;
	}

	let {
		resourceDisplayName,
		trickleQuantity,
		trueConcentrationPercent,
		energyCost,
		surveyEnergyAfter,
		surveyEnergyCap,
		statsRevealedThisSample,
		yieldBandLabel,
		stats
	}: Props = $props();
</script>

<aside class="sample-result panel-inset" aria-live="polite">
	<p class="sample-result__headline">
		Sample complete — <strong>+{trickleQuantity}u</strong> @ {trueConcentrationPercent}%
	</p>
	<p class="sample-result__meta">
		<span>{resourceDisplayName}</span>
		<span class="sample-result__dot">·</span>
		<span>{yieldBandLabel}</span>
	</p>
	<p class="sample-result__energy">
		Survey energy: {surveyEnergyAfter} / {surveyEnergyCap}
		<span class="sample-result__spend">(−{energyCost})</span>
	</p>

	{#if stats}
		<div class="sample-result__stats">
			<h3 class="sample-result__stats-title">
				{statsRevealedThisSample ? 'Resource quality — first reveal' : 'Resource quality'}
			</h3>
			<dl class="stat-grid">
				{#each FIELD_STAT_ROWS as row (row.key)}
					<div class="stat-grid__row">
						<dt>{row.label}</dt>
						<dd>{stats[row.key]}</dd>
					</div>
				{/each}
			</dl>
		</div>
	{/if}
</aside>

<style>
	.sample-result {
		margin-top: 1rem;
		padding: 0.85rem 1rem;
		border: 1px solid var(--phosphor-dim);
		box-shadow: inset 0 0 16px var(--phosphor-glow);
	}

	.sample-result__headline {
		margin: 0 0 0.35rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--text-bright);
	}

	.sample-result__headline strong {
		color: var(--phosphor);
		font-weight: 700;
	}

	.sample-result__meta {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.sample-result__dot {
		margin: 0 0.35rem;
	}

	.sample-result__energy {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.sample-result__spend {
		color: var(--accent-warning);
	}

	.sample-result__stats {
		margin-top: 0.85rem;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-subtle);
	}

	.sample-result__stats-title {
		margin: 0 0 0.6rem;
		font-size: var(--font-size-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.stat-grid {
		margin: 0;
		display: grid;
		gap: 0.35rem;
	}

	.stat-grid__row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: baseline;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
	}

	.stat-grid dt {
		margin: 0;
		color: var(--text-muted);
	}

	.stat-grid dd {
		margin: 0;
		color: var(--text-bright);
		font-variant-numeric: tabular-nums;
	}
</style>
