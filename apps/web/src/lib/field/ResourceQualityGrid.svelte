<script lang="ts">
	import { FIELD_STAT_ROWS, type FieldResourceStats } from '$lib/field/resourceStats';

	interface Props {
		stats: FieldResourceStats;
		compact?: boolean;
	}

	let { stats, compact = false }: Props = $props();
</script>

<dl class="stat-grid" class:stat-grid--compact={compact}>
	{#each FIELD_STAT_ROWS as row (row.key)}
		<div class="stat-grid__row">
			<dt>{row.label}</dt>
			<dd>{stats[row.key]}</dd>
		</div>
	{/each}
</dl>

<style>
	.stat-grid {
		margin: 0;
		display: grid;
		gap: 0.35rem;
	}

	.stat-grid--compact {
		gap: 0.25rem;
	}

	.stat-grid__row {
		display: grid;
		grid-template-columns: 1fr auto;
		gap: 0.75rem;
		align-items: baseline;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
	}

	.stat-grid--compact .stat-grid__row {
		font-size: 0.68rem;
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
