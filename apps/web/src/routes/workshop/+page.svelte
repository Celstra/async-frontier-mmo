<script lang="ts">
	import SchematicList from '$lib/workshop/SchematicList.svelte';
	import WorkshopBench from '$lib/workshop/WorkshopBench.svelte';
	import CraftResultHistory from '$lib/workshop/CraftResultHistory.svelte';
	import SupplyCratesPanel from '$lib/workshop/SupplyCratesPanel.svelte';
	import FabricatorBayArt from '$lib/workshop/FabricatorBayArt.svelte';
	import WorkshopMissionPanel from '$lib/workshop/WorkshopMissionPanel.svelte';
	import WorkshopStepStrip from '$lib/workshop/WorkshopStepStrip.svelte';
	import type { WorkshopMissionStep } from '$lib/workshop/workshopMission';
	import { findNextEmptySchematicSlot } from '$lib/workshop/workshopSlotFlow';
	import { invalidate } from '$app/navigation';
	import { onMount } from 'svelte';
	import { postWorkshopUxTelemetry } from '$lib/workshop/postWorkshopUxTelemetry';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);

	const highlightItemId = $derived(craftOutcome?.item.id ?? null);

	let slotSelections = $state<Record<string, string>>({});
	let activeSlotId = $state<string | null>(null);
	let resourcePickerReturnFocus = $state<HTMLElement | null>(null);
	let trackedSchematicId = $state<string | null>(null);
	let benchMissionStep = $state<WorkshopMissionStep>('load_slots');

	const activeMissionStep = $derived(
		data.schematic && data.schematicDefinition ? benchMissionStep : 'pick_schematic'
	);

	const hasCraftedAnyWorkshopPrototype = $derived(data.hasCraftedAnyWorkshopPrototype);

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
					nextEmptySlotId:
						findNextEmptySchematicSlot(
							data.schematicDefinition,
							slotSelections,
							data.inventory
						)?.id ?? null,
					onSlotClick: (slotId: string, trigger: HTMLElement) => {
						resourcePickerReturnFocus = trigger;
						activeSlotId = slotId;
					}
				}
			: null
	);

	async function syncWorkshopSupply(): Promise<void> {
		await invalidate('workshop:supply');
	}

	onMount(() => {
		void postWorkshopUxTelemetry('mission_panel_seen');

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
		<WorkshopMissionPanel activeStep={activeMissionStep} />
		<WorkshopStepStrip activeStep={activeMissionStep} />

		{#if form?.message && !craftOutcome}
			<p class="flash flash--error" role="alert">{form.message}</p>
		{/if}

		<div class="workshop-layout workshop-layout--fabricator">
			<div class="workshop-rail">
				<FabricatorBayArt />
				<aside class="workshop-sidebar">
					{#if hasCraftedAnyWorkshopPrototype}
						<SupplyCratesPanel supply={data.supply} onTimerDue={syncWorkshopSupply} />
					{:else}
						<p class="supply-locked-hint" data-testid="supply-crates-locked">
							Supply crates unlock after your first prototype.
						</p>
					{/if}
					<SchematicList
						schematics={data.schematics}
						selectedSchematicId={data.selectedSchematicId}
						station="fabricator"
						assembly={assemblyProps}
					/>
				</aside>
			</div>

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
						bind:missionStep={benchMissionStep}
						returnFocus={resourcePickerReturnFocus}
					/>
				{:else}
					<h2 class="workshop-main__title">Fabricator bench</h2>
					<p class="workshop-framing">
						Select <strong>Basic Drill Head</strong> in the schematic list to begin the workshop
						test. Bench stock was granted on your first visit.
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

	.workshop-framing strong {
		color: var(--accent-warning);
		font-weight: 700;
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

	.workshop-rail {
		display: grid;
		gap: 1rem;
	}

	.workshop-sidebar {
		display: grid;
		gap: 1rem;
	}

	.supply-locked-hint {
		margin: 0;
		padding: 0.55rem 0.65rem;
		border: 1px dashed var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
		color: var(--text-muted);
		font-size: var(--font-size-xs);
		line-height: 1.45;
	}

	:global(#workshop-step-pick-schematic),
	:global(#workshop-step-load-slots),
	:global(#workshop-step-tune),
	:global(#workshop-step-craft),
	:global(#craft-result),
	:global(#workshop-step-compare-history) {
		scroll-margin-top: 0.75rem;
	}
</style>
