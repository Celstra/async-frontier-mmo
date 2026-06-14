<script lang="ts">
	import ChassisAssemblyPanel from '$lib/workshop/ChassisAssemblyPanel.svelte';
	import SchematicList from '$lib/workshop/SchematicList.svelte';
	import WorkshopBench from '$lib/workshop/WorkshopBench.svelte';
	import { FABRICATOR_ONLINE } from '$lib/ascii';
	import { THUMPER_CHASSIS_ASSEMBLY } from '@async-frontier-mmo/domain';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);

	const isThumperStation = $derived(data.workshopStation === 'thumper');
	const showFirstDeployReady = $derived(
		data.tutorialStep === 'first_deploy' && data.rigAssembled
	);
</script>

<section class="screen" aria-label="Workshop console">
	<header class="screen__header workshop-header">WORKSHOP — Fabricator bay</header>

	<div class="screen__body">
		<nav class="station-nav" aria-label="Workshop stations">
			<a
				href="/workshop?station=thumper"
				class="station-nav__link"
				class:station-nav__link--active={isThumperStation}
				aria-current={isThumperStation ? 'page' : undefined}
			>
				Thumper
			</a>
			<a
				href="/workshop?station=fabricator"
				class="station-nav__link"
				class:station-nav__link--active={!isThumperStation}
				aria-current={!isThumperStation ? 'page' : undefined}
			>
				Fabricator
			</a>
		</nav>

		{#if form?.message && !craftOutcome}
			<p class="flash flash--error" role="alert">{form.message}</p>
		{/if}

		{#if isThumperStation}
			<div class="workshop-layout workshop-layout--thumper">
				<div class="workshop-main">
					{#if showFirstDeployReady}
						<h2 class="workshop-main__title">Rig assembled</h2>
						<p class="workshop-framing">
							Chassis is ready. Foreman wants you on FIELD — deploy on the locked Keth Iron
							waypoint from your first structural order.
						</p>
					{:else}
						<h2 class="workshop-main__title">Thumper chassis</h2>
						<p class="workshop-framing">
							Slot scavenged hull, drill, and pump into the chassis, then assemble the rig.
						</p>
					{/if}
					<ChassisAssemblyPanel
						title={data.chassisAssembly.displayName}
						description={data.chassisAssembly.description}
						readiness={data.chassisReadiness}
						thumperParts={data.thumperParts}
						selections={data.chassisSelections}
						rigAssembled={data.rigAssembled}
						firstDeployPrompt={showFirstDeployReady}
					/>
				</div>
			</div>
		{:else}
			<div class="workshop-layout workshop-layout--fabricator">
				<pre class="fabricator-art fabricator-art--header" aria-hidden="true">{FABRICATOR_ONLINE}</pre>
				<SchematicList
					schematics={data.schematics}
					selectedSchematicId={data.selectedSchematicId}
					station="fabricator"
				/>

				<div class="workshop-main">
					{#if data.schematic && data.schematicDefinition}
						<h2 class="workshop-main__title">Assemble {data.schematic.displayName}</h2>
						{#if data.materialRollup}
							<p class="workshop-material-rollup">{data.materialRollup}</p>
						{/if}
						<WorkshopBench
							schematic={data.schematicDefinition}
							inventory={data.inventory}
							allocationHints={data.allocationHints}
							defaultSelections={data.slotSelections}
							{craftOutcome}
							schematicReadiness={data.schematicReadiness}
						/>
					{:else}
						<h2 class="workshop-main__title">Fabricator bench</h2>
						<p class="workshop-framing">
							Pick a schematic from the list. Locked recipes stay visible — nothing auto-selects
							a schematic you cannot craft yet.
						</p>
					{/if}
				</div>
			</div>
		{/if}
	</div>
</section>

<style>
	.workshop-header {
		margin: 0;
	}

	.station-nav {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.station-nav__link {
		padding: 0.45rem 0.85rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		text-decoration: none;
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.station-nav__link--active {
		color: var(--phosphor);
		border-color: var(--phosphor-dim);
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

	.fabricator-art {
		margin: 0;
		font-family: var(--font-mono);
		font-size: clamp(0.55rem, 2vw, var(--font-size-xs));
		line-height: 1.3;
		color: var(--phosphor);
		white-space: pre-wrap;
		overflow-x: hidden;
		max-width: 100%;
	}

	.fabricator-art--header {
		margin-bottom: 0.25rem;
	}

	@media (min-width: 900px) {
		.workshop-layout {
			grid-template-columns: minmax(14rem, 18rem) 1fr;
			align-items: start;
		}
	}
</style>
