<script lang="ts">
	import ResourceQualityGrid from '$lib/field/ResourceQualityGrid.svelte';
	import type { FieldResourceStats } from '$lib/field/resourceStats';

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
		orderStatusLine?: string | null;
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
		stats,
		orderStatusLine = null
	}: Props = $props();

	const orderFilled = $derived(
		orderStatusLine !== null && orderStatusLine.startsWith('ORDER FILLED')
	);
</script>

<aside class="sample-result panel-inset" aria-live="polite">
	{#if orderStatusLine}
		<p class="sample-result__order" class:sample-result__order--filled={orderFilled}>
			{orderStatusLine}
		</p>
	{/if}
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
			<ResourceQualityGrid {stats} />
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

	.sample-result__order {
		margin: 0 0 0.65rem;
		padding: 0.45rem 0.55rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		border-left: 2px solid var(--phosphor-dim);
	}

	.sample-result__order--filled {
		color: var(--phosphor);
		font-weight: 700;
		border-left-color: var(--phosphor);
		text-shadow: 0 0 8px var(--phosphor-glow);
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

</style>
