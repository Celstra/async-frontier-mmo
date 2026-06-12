<script lang="ts">
	import ChassisAssemblyPanel from '$lib/workshop/ChassisAssemblyPanel.svelte';
	import SchematicList from '$lib/workshop/SchematicList.svelte';
	import WorkshopBench from '$lib/workshop/WorkshopBench.svelte';
	import { THUMPER_CHASSIS_ASSEMBLY } from '@async-frontier-mmo/domain';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);

	const isChassisView = $derived(data.selectedSchematicId === THUMPER_CHASSIS_ASSEMBLY.id);
</script>

<section class="screen" aria-label="Workshop console">
	<header class="screen__header workshop-header">WORKSHOP — Fabricator bench</header>

	<div class="screen__body">
		<pre class="workshop-art" aria-hidden="true">
   ___[ WORKSHOP ]___
  /                 \
 | SCHEMATIC | BENCH |
 |  STORAGE  | LIGHT |
  \_________________/
        FABRICATOR</pre>

		<p class="workshop-framing">
			Pick a schematic, fill each socket from one resource stack, tune three points, then assemble.
		</p>

		{#if form?.message && !craftOutcome}
			<p class="flash flash--error" role="alert">{form.message}</p>
		{/if}

		<div class="workshop-layout">
			<SchematicList schematics={data.schematics} selectedSchematicId={data.selectedSchematicId} />

			<div class="workshop-main">
				{#if isChassisView}
					<ChassisAssemblyPanel
						title={data.chassisAssembly.displayName}
						description={data.chassisAssembly.description}
						readiness={data.chassisReadiness}
						thumperParts={data.thumperParts}
						selections={data.chassisSelections}
						rigAssembled={data.rigAssembled}
					/>
				{:else}
					<h2 class="workshop-main__title">Assemble {data.schematic.displayName}</h2>
					<WorkshopBench
						schematic={data.schematicDefinition}
						inventory={data.inventory}
						allocationHints={data.allocationHints}
						defaultSelections={data.slotSelections}
						{craftOutcome}
						schematicReadiness={data.schematicReadiness}
					/>
				{/if}
			</div>
		</div>
	</div>
</section>

<style>
	.workshop-header {
		margin: 0;
	}

	.workshop-art {
		margin: 0 0 1rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1.35;
		color: var(--phosphor);
		white-space: pre;
		overflow-x: auto;
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
		letter-spacing: 0.06em;
	}

	@media (min-width: 900px) {
		.workshop-layout {
			grid-template-columns: minmax(14rem, 18rem) 1fr;
			align-items: start;
		}
	}
</style>
