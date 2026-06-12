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

<div class="energy-bar" class:energy-bar--compact={compact}>
	<div class="energy-bar__row">
		<span class="energy-bar__label">Survey energy</span>
		<span class="energy-bar__value">{energy} / {cap}</span>
	</div>
	<div
		class="energy-bar__track"
		role="meter"
		aria-valuenow={energy}
		aria-valuemin={0}
		aria-valuemax={cap}
	>
		<div class="energy-bar__fill" style:width="{fillPercent}%"></div>
	</div>
	{#if outlook.hoursUntilFull > 0}
		<p class="energy-bar__regen">
			Regenerates {outlook.regenSamplesPerHour} samples/hr — full in {Math.ceil(
				outlook.hoursUntilFull * 60
			)}m
		</p>
	{:else}
		<p class="energy-bar__regen energy-bar__regen--full">Energy full</p>
	{/if}
</div>

<style>
	.energy-bar {
		display: grid;
		gap: 0.35rem;
	}

	.energy-bar--compact .energy-bar__regen {
		display: none;
	}

	.energy-bar__row {
		display: flex;
		justify-content: space-between;
		align-items: baseline;
		gap: 0.5rem;
	}

	.energy-bar__label {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.energy-bar__value {
		font-size: var(--font-size-sm);
		font-weight: 600;
		font-variant-numeric: tabular-nums;
		color: var(--text-primary);
	}

	.energy-bar__track {
		height: 0.45rem;
		border-radius: 999px;
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		overflow: hidden;
	}

	.energy-bar__fill {
		height: 100%;
		border-radius: 999px;
		background: linear-gradient(90deg, var(--phosphor-dim) 0%, var(--phosphor) 100%);
		box-shadow: 0 0 8px var(--phosphor-glow);
		transition: width 0.3s ease;
	}

	.energy-bar__regen {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.energy-bar__regen--full {
		color: var(--phosphor);
	}
</style>
