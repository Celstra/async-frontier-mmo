<script lang="ts">
	import type { SchematicDefinition } from '@async-frontier-mmo/domain';
	import type { WorkshopSchematicRow } from '$lib/server/workshopLoad';
	import AssemblyBoard from './AssemblyBoard.svelte';

	const SCHEMATIC_DISPLAY_ORDER = [
		'efficient_pump',
		'basic_drill_head',
		'reinforced_hull_plate'
	] as const;

	interface InventoryStack {
		resourceInstanceId: string;
		displayName: string;
		family: string;
	}

	interface AssemblyProps {
		schematic: SchematicDefinition;
		inventory: InventoryStack[];
		slotSelections: Record<string, string>;
		activeSlotId: string | null;
		onSlotClick: (slotId: string, trigger: HTMLElement) => void;
	}

	interface Props {
		schematics: WorkshopSchematicRow[];
		selectedSchematicId: string | null;
		station?: 'fabricator';
		assembly?: AssemblyProps | null;
	}

	let { schematics, selectedSchematicId, station = 'fabricator', assembly = null }: Props = $props();

	const orderedSchematics = $derived(
		[...schematics].sort(
			(a, b) =>
				SCHEMATIC_DISPLAY_ORDER.indexOf(a.id as (typeof SCHEMATIC_DISPLAY_ORDER)[number]) -
				SCHEMATIC_DISPLAY_ORDER.indexOf(b.id as (typeof SCHEMATIC_DISPLAY_ORDER)[number])
		)
	);

	function readinessLabel(row: WorkshopSchematicRow): string {
		if (row.craftableNow) return 'Ready';
		return 'Missing materials';
	}

	function schematicHref(rowId: string): string {
		return `/workshop?station=${station}&schematic=${rowId}`;
	}

	function handleSchematicClick(event: MouseEvent, rowId: string): void {
		if (rowId === selectedSchematicId) {
			event.preventDefault();
		}
	}
</script>

<nav class="schematic-list panel" aria-label="Workshop schematics">
	<p class="schematic-list__label">Schematics</p>
	<ul class="schematic-list__items">
		{#each orderedSchematics as row (row.id)}
			<li class="schematic-item" class:schematic-item--expanded={row.id === selectedSchematicId}>
				<a
					href={schematicHref(row.id)}
					class="schematic-row"
					class:schematic-row--active={row.id === selectedSchematicId}
					aria-current={row.id === selectedSchematicId ? 'page' : undefined}
					aria-expanded={row.id === selectedSchematicId ? 'true' : 'false'}
					data-sveltekit-noscroll
					onclick={(event) => handleSchematicClick(event, row.id)}
				>
					<span class="schematic-row__name">{row.displayName}</span>
					<span
						class="schematic-row__state"
						class:schematic-row__state--ready={row.craftableNow}
					>
						{readinessLabel(row)}
					</span>
				</a>

				{#if row.id === selectedSchematicId && assembly?.schematic.id === row.id}
					<AssemblyBoard
						schematic={assembly.schematic}
						slotSelections={assembly.slotSelections}
						activeSlotId={assembly.activeSlotId}
						inventory={assembly.inventory}
						onSlotClick={assembly.onSlotClick}
					/>
				{/if}
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

	.schematic-item--expanded .schematic-row {
		border-color: var(--phosphor);
		background: var(--bg-panel);
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
