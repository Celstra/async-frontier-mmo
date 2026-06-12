<script lang="ts">
	import type { SurveyEnergyOutlook } from '@async-frontier-mmo/domain';

	interface Props {
		energy: number;
		cap: number;
		outlook: SurveyEnergyOutlook;
		compact?: boolean;
	}

	let { energy, cap, outlook, compact = false }: Props = $props();

	const fillPercent = $derived(cap > 0 ? Math.min(100, Math.round((energy / cap) * 100)) : 0);
</script>

<div class="energy-meter" class:energy-meter--compact={compact}>
	<div class="energy-meter__row">
		<span class="energy-meter__label">Survey energy</span>
		<span class="energy-meter__value">{energy} / {cap}</span>
	</div>
	<div class="energy-meter__track" role="meter" aria-valuenow={energy} aria-valuemin={0} aria-valuemax={cap}>
		<div class="energy-meter__fill" style:width="{fillPercent}%"></div>
	</div>
	{#if outlook.minutesUntilFull > 0}
		<p class="energy-meter__regen">
			Regenerates {outlook.regenPerMinute}/min — full in {outlook.minutesUntilFull}m
		</p>
	{:else}
		<p class="energy-meter__regen energy-meter__regen--full">Energy full</p>
	{/if}
</div>

<style>
	.energy-meter {
		display: grid;
		gap: 0.35rem;
	}

	.energy-meter--compact .energy-meter__regen {
		font-size: 0.8rem;
	}

	.energy-meter__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.energy-meter__label {
		font-size: 0.8rem;
		color: var(--text-muted, #9ca3af);
	}

	.energy-meter__value {
		font-size: 0.85rem;
		font-weight: 600;
		font-variant-numeric: tabular-nums;
	}

	.energy-meter__track {
		height: 0.45rem;
		border-radius: 999px;
		background: var(--surface-inset, #2a2a2a);
		overflow: hidden;
	}

	.energy-meter__fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%);
		transition: width 0.3s ease;
	}

	.energy-meter__regen {
		margin: 0;
		font-size: 0.85rem;
		color: var(--text-muted, #9ca3af);
	}

	.energy-meter__regen--full {
		color: var(--accent-success, #4ade80);
	}
</style>
