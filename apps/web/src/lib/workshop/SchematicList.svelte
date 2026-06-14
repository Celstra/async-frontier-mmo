<script lang="ts">
	import type { WorkshopSchematicRow } from '$lib/server/workshopLoad';
	import { THUMPER_CHASSIS_ASSEMBLY } from '@async-frontier-mmo/domain';

	interface Props {
		schematics: WorkshopSchematicRow[];
		selectedSchematicId: string | null;
		station?: 'fabricator';
	}

	let { schematics, selectedSchematicId, station = 'fabricator' }: Props = $props();

	function readinessLabel(row: WorkshopSchematicRow): string {
		if (row.craftableNow) return 'Ready';
		if (row.id === THUMPER_CHASSIS_ASSEMBLY.id) return 'Needs parts';
		return 'Missing materials';
	}
</script>

<nav class="schematic-list panel" aria-label="Workshop schematics">
	<p class="schematic-list__label">Schematics</p>
	<ul class="schematic-list__items">
		{#each schematics as row (row.id)}
			<li>
				<a
					href="/workshop?station={station}&schematic={row.id}"
					class="schematic-row"
					class:schematic-row--active={row.id === selectedSchematicId}
					aria-current={row.id === selectedSchematicId ? 'page' : undefined}
				>
					<span class="schematic-row__name">{row.displayName}</span>
					<span
						class="schematic-row__state"
						class:schematic-row__state--ready={row.craftableNow}
					>
						{readinessLabel(row)}
					</span>
				</a>
			</li>
		{/each}
	</ul>
</nav>

<style>
	.schematic-list__label {
		margin: 0 0 0.65rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.schematic-list__items {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.4rem;
	}

	.schematic-row {
		display: flex;
		flex-direction: column;
		align-items: stretch;
		gap: 0.25rem;
		padding: 0.6rem 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
		color: var(--text-primary);
		text-decoration: none;
		font-size: var(--font-size-sm);
	}

	.schematic-row:hover {
		border-color: var(--phosphor-dim);
	}

	.schematic-row--active {
		border-color: var(--phosphor);
		background: var(--bg-panel);
	}

	.schematic-row__name {
		flex: 1;
		min-width: 0;
	}

	.schematic-row__state {
		flex-shrink: 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.schematic-row__state--ready {
		color: var(--phosphor);
	}
</style>
