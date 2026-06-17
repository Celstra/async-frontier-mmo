<script lang="ts">
	import SchematicList from '$lib/workshop/SchematicList.svelte';
	import WorkshopBench from '$lib/workshop/WorkshopBench.svelte';
	import CraftResultHistory from '$lib/workshop/CraftResultHistory.svelte';
	import SupplyCratesPanel from '$lib/workshop/SupplyCratesPanel.svelte';
	import FabricatorBayArt from '$lib/workshop/FabricatorBayArt.svelte';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);

	const highlightItemId = $derived(craftOutcome?.item.id ?? null);

	let slotSelections = $state<Record<string, string>>({});
	let activeSlotId = $state<string | null>(null);
	let trackedSchematicId = $state<string | null>(null);

	$effect(() => {
		const schematicId = data.selectedSchematicId;
		if (schematicId !== trackedSchematicId) {
			activeSlotId = null;
			trackedSchematicId = schematicId;
		}
	});

	const assemblyProps = $derived(
		data.schematicDefinition && data.schematic
			? {
					schematic: data.schematicDefinition,
					inventory: data.inventory,
					slotSelections,
					activeSlotId,
					onSlotClick: (slotId: string) => {
						activeSlotId = slotId;
					}
				}
			: null
	);

	async function syncWorkshopSupply(): Promise<void> {
		await invalidate('workshop:supply');
	}

	onMount(() => {
		const syncWhileActive = () => {
			if (document.visibilityState !== 'visible') {
				return;
			}
			void syncWorkshopSupply();
		};

		const intervalId = setInterval(syncWhileActive, 30_000);
		const onVisibilityChange = () => {
			if (document.visibilityState === 'visible') {
				void syncWorkshopSupply();
			}
		};

		document.addEventListener('visibilitychange', onVisibilityChange);
		return () => {
			clearInterval(intervalId);
			document.removeEventListener('visibilitychange', onVisibilityChange);
		};
	});
</script>

<section class="screen" aria-label="Workshop console">
	<header class="screen__header workshop-header">WORKSHOP — Fabricator bay</header>

	<div class="screen__body">
		{#if form?.message && !craftOutcome}
			<p class="flash flash--error" role="alert">{form.message}</p>
		{/if}

		<div class="workshop-layout workshop-layout--fabricator">
			<FabricatorBayArt />
			<aside class="workshop-sidebar">
				<SupplyCratesPanel supply={data.supply} onTimerDue={syncWorkshopSupply} />
				<SchematicList
					schematics={data.schematics}
					selectedSchematicId={data.selectedSchematicId}
					station="fabricator"
					assembly={assemblyProps}
				/>
			</aside>

			<div class="workshop-main">
				{#if data.schematic && data.schematicDefinition}
					<h2 class="workshop-main__title">Assemble {data.schematic.displayName}</h2>
					{#if data.materialRollup}
						<p class="workshop-material-rollup">{data.materialRollup}</p>
					{/if}
					<CraftResultHistory history={data.selectedCraftHistory} {highlightItemId} />
					<WorkshopBench
						schematic={data.schematicDefinition}
						inventory={data.inventory}
						defaultSelections={data.slotSelections}
						{craftOutcome}
						schematicReadiness={data.schematicReadiness}
						bind:slotSelections
						bind:activeSlotId
					/>
				{:else}
					<h2 class="workshop-main__title">Fabricator bench</h2>
					<p class="workshop-framing">
						Pick one of the three thumper-part schematics. Bench stock was granted on your first
						visit — compare crafts, experiment, and reclaim when you need more material.
					</p>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.workshop-header {
		margin: 0;
	}

	.workshop-framing {
		margin: 0 0 1.25rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.45;
	}

	.workshop-layout {
		display: grid;
		gap: 1rem;
	}

	.workshop-main__title {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
		text-transform: uppercase;
	}

	.workshop-material-rollup {
		margin: 0 0 1rem;
		font-size: var(--font-size-sm);
		color: var(--accent-warning);
	}

	.workshop-layout--fabricator {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 900px) {
		.workshop-layout {
			grid-template-columns: minmax(14rem, 18rem) 1fr;
			align-items: start;
		}
	}

	.workshop-sidebar {
		display: grid;
		gap: 1rem;
	}
</style>
