<script lang="ts">
	import EquipSlotPanel from '$lib/rig/EquipSlotPanel.svelte';
	import ResourceStacksPanel from '$lib/rig/ResourceStacksPanel.svelte';
	import RigChassisPanel from '$lib/rig/RigChassisPanel.svelte';
	import ScannerPanel from '$lib/rig/ScannerPanel.svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();
</script>

<section class="screen" aria-label="Rig console">
	<header class="screen__header rig-header">RIG — Thumper chassis</header>

	<div class="screen__body">
		{#if form?.message}
			<p class="flash flash--error" role="alert">{form.message}</p>
		{/if}

		<RigChassisPanel
			maxRunLine={data.maxRunLine}
			hullIntegrity={data.hullIntegrity}
			equippedParts={data.equippedParts}
			repairDebtLine={data.repairDebtLine}
		/>

		<div class="rig-layout">
			<div class="rig-layout__equip">
				<h2 class="panel__title">Equip &amp; swap</h2>
				<EquipSlotPanel
					slotLabel="Drill"
					slot="drill"
					candidates={data.partCandidates.drill}
					repairKitCount={data.repairKitCount}
				/>
				<EquipSlotPanel
					slotLabel="Pump"
					slot="pump"
					candidates={data.partCandidates.pump}
					repairKitCount={data.repairKitCount}
				/>
				<EquipSlotPanel
					slotLabel="Hull"
					slot="hull"
					candidates={data.partCandidates.hull}
					repairKitCount={data.repairKitCount}
				/>
				<ScannerPanel
					equippedScanner={data.equippedScanner}
					candidates={data.scannerCandidates}
					repairKitCount={data.repairKitCount}
				/>
			</div>

			<ResourceStacksPanel resourcesByFamily={data.resourcesByFamily} />
		</div>
	</div>
</section>

<style>
	.rig-header {
		letter-spacing: 0.08em;
	}

	.rig-layout {
		display: grid;
		gap: 1rem;
		margin-top: 1rem;
	}

	@media (min-width: 52rem) {
		.rig-layout {
			grid-template-columns: minmax(0, 1.1fr) minmax(0, 0.9fr);
			align-items: start;
		}
	}

	.rig-layout__equip {
		display: grid;
		gap: 0.5rem;
	}

	:global(.panel) {
		padding: 1rem;
		margin-bottom: 1rem;
		background: var(--bg-panel);
		border: 1px solid var(--border-default);
		border-radius: 4px;
	}

	:global(.panel-inset) {
		margin-bottom: 0.5rem;
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
	}

	:global(.panel__title) {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	:global(.action-row) {
		text-align: left;
		padding: 0.45rem 0.65rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--text-primary);
		background: var(--bg-panel);
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		cursor: pointer;
	}

	:global(.action-row:hover:not(:disabled)) {
		background: var(--bg-hover);
		border-color: var(--border-strong);
	}

	.flash {
		padding: 0.65rem 0.75rem;
		border-radius: 4px;
		margin-bottom: 1rem;
	}

	.flash--error {
		background: var(--accent-danger-dim);
		color: #ffd0d0;
	}
</style>
