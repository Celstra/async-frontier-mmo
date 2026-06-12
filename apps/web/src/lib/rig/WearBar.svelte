<script lang="ts">
	interface Props {
		label: string;
		value: number;
	}

	let { label, value }: Props = $props();

	const tone = $derived(
		value >= 70 ? 'wear-bar__fill--ok' : value >= 35 ? 'wear-bar__fill--warn' : 'wear-bar__fill--low'
	);
</script>

<div class="wear-bar">
	<div class="wear-bar__header">
		<span class="wear-bar__label">{label}</span>
		<span class="wear-bar__value">{value}%</span>
	</div>
	<div class="wear-bar__track" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
		<div class="wear-bar__fill {tone}" style:width="{Math.max(0, Math.min(100, value))}%"></div>
	</div>
</div>

<style>
	.wear-bar {
		display: grid;
		gap: 0.25rem;
	}

	.wear-bar__header {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.wear-bar__value {
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.wear-bar__track {
		height: 0.45rem;
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		overflow: hidden;
	}

	.wear-bar__fill {
		height: 100%;
		transition: width 0.2s ease;
	}

	.wear-bar__fill--ok {
		background: var(--phosphor);
	}

	.wear-bar__fill--warn {
		background: var(--accent-warning);
	}

	.wear-bar__fill--low {
		background: var(--accent-danger);
	}
</style>
