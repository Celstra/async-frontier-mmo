<script lang="ts">
	import { enhance } from '$app/forms';
	import { familyDisplayLabel, thumperPartSlotLabel } from '$lib/displayLabels';
	import CraftWorkbench from '$lib/craft/CraftWorkbench.svelte';
	import type { PageProps } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	let { data, form }: PageProps = $props();

	// Inline flash states for equip/repair actions
	let equipFlash = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let repairFlash = $state<{ message: string; type: 'success' | 'error' } | null>(null);

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);

	const equipOutcome = $derived(
		form && 'equipOutcome' in form ? form.equipOutcome : undefined
	);
	const equipThumperOutcome = $derived(
		form && 'equipThumperOutcome' in form ? form.equipThumperOutcome : undefined
	);
	const repairOutcome = $derived(
		form && 'repairOutcome' in form ? form.repairOutcome : undefined
	);

	// Show flashes from form results
	$effect(() => {
		if (equipOutcome) {
			equipFlash = {
				message: `Equipped ${equipOutcome.displayName} — Survey Clarity ${equipOutcome.surveyClarity}`,
				type: 'success'
			};
		}
	});

	$effect(() => {
		if (equipThumperOutcome && 'displayName' in equipThumperOutcome) {
			equipFlash = {
				message: `Equipped ${equipThumperOutcome.displayName} (${thumperPartSlotLabel(equipThumperOutcome.slot)}) — condition ${equipThumperOutcome.condition}, integrity ${equipThumperOutcome.integrity}`,
				type: 'success'
			};
		}
	});

	$effect(() => {
		if (repairOutcome) {
			repairFlash = {
				message: `Repaired ${repairOutcome.displayName} — condition ${repairOutcome.condition}, integrity ${repairOutcome.integrity}. Kits remaining: ${repairOutcome.fieldRepairKitCount}`,
				type: 'success'
			};
		}
	});

	function canRepairItem(condition: number, integrity: number): boolean {
		return data.fieldRepairKitCount > 0 && (condition < 100 || integrity < 100);
	}

	// Enhance handlers for inline feedback
	const handleEquipScanner: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'failure') {
				equipFlash = { message: String(result.data?.message ?? 'Equip failed'), type: 'error' };
			}
		};
	};

	const handleEquipThumperPart: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'failure') {
				equipFlash = { message: String(result.data?.message ?? 'Equip failed'), type: 'error' };
			}
		};
	};

	const handleRepair: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update();
			if (result.type === 'failure') {
				repairFlash = { message: String(result.data?.message ?? 'Repair failed'), type: 'error' };
			}
		};
	};
</script>

<p><a href="/">← Pilot Home</a></p>

<h1>Crafting + Gear</h1>

<p class="intro">
	<small>
		Your resources' stats set what's possible. The schematic's weights decide which stats matter.
		Three tuning points let you choose where the quality goes.
	</small>
</p>

{#if form?.message && !form?.craftOutcome && !form?.equipOutcome && !form?.equipThumperOutcome && !form?.repairOutcome}
	<p class="flash flash--error">{form.message}</p>
{/if}

<!-- Crafting Section -->
<section class="craft-section">
	<nav class="schematic-list">
		<h2>Schematics</h2>
		<ul>
			{#each data.schematics as schematic}
				<li>
					<a
						href="/craft?schematic={schematic.id}"
						aria-current={schematic.id === data.selectedSchematicId ? 'page' : undefined}
					>
						{schematic.displayName}
					</a>
				</li>
			{/each}
		</ul>
	</nav>

	<div class="workbench-area">
		<h2>Craft {data.schematic.displayName}</h2>
		
		<CraftWorkbench
			schematic={data.schematicDefinition}
			inventory={data.inventory}
			allocationHints={data.allocationHints}
			defaultSelections={data.slotSelections}
			craftOutcome={craftOutcome}
		/>
	</div>
</section>

<!-- Inventory Section -->
<section class="inventory-panel">
	<h2>Owned Resources</h2>
	{#if data.veyrithStack}
		<p class="highlight-stack">
			<strong>Veyrith Copper:</strong> {data.veyrithStack.quantity} units — conductivity
			{data.veyrithStack.stats.conductivity}, OQ {data.veyrithStack.stats.OQ}
		</p>
	{/if}
	{#if data.inventory.length === 0}
		<p class="empty-state">No stacks yet — claim a thumper run first.</p>
	{:else}
		<table class="comparison-table">
			<thead>
				<tr>
					<th>Resource</th>
					<th>Qty</th>
					<th>Key stats</th>
					<th>Best use</th>
					<th>Also useful for</th>
				</tr>
			</thead>
			<tbody>
				{#each data.allocationHints as hint}
					<tr>
						<td>{hint.displayName}</td>
						<td>{hint.quantity}</td>
						<td>
							OQ {hint.stats.OQ}, Cond {hint.stats.conductivity}, Heat
							{hint.stats.heat_resistance}
						</td>
						<td>{hint.bestUse}</td>
						<td>{hint.otherUses.join('; ') || '—'}</td>
					</tr>
				{/each}
			</tbody>
		</table>
	{/if}
</section>

<!-- Gear + Repair Section -->
<section class="gear-panel">
	<h2>Gear + Repair</h2>
	<p class="kit-count">Field Repair kits owned: {data.fieldRepairKitCount}</p>

	<!-- Scanners -->
	<div class="gear-category">
		<h3>Survey Scanners</h3>
		<p class="equipped-info">
			Equipped: <strong>{data.equippedScanner?.displayName ?? 'Basic Scanner Mk 0'}</strong>
		</p>

		{#if equipFlash}
			<div class="inline-flash flash--{equipFlash.type}">
				{equipFlash.message}
				<button type="button" class="dismiss-btn" onclick={() => equipFlash = null}>×</button>
			</div>
		{/if}

		{#if data.scannerItems.length > 0}
			<ul class="item-list">
				{#each data.scannerItems as scanner}
					<li class="item-row" class:equipped={scanner.equipped}>
						<div class="item-info">
							<span class="item-name">{scanner.displayName}</span>
							<span class="item-stats">
								Survey Clarity {scanner.surveyClarity}, 
								condition {scanner.condition}, 
								integrity {scanner.integrity}
							</span>
							{#if scanner.equipped}
								<span class="equipped-badge">(equipped)</span>
							{/if}
						</div>
						<div class="item-actions">
							{#if !scanner.equipped}
								<form method="POST" action="?/equipScanner" use:enhance={handleEquipScanner}>
									<input type="hidden" name="itemId" value={scanner.id} />
									<button type="submit" class="action-btn equip-btn">Equip</button>
								</form>
							{/if}
							{#if canRepairItem(scanner.condition, scanner.integrity)}
								<form method="POST" action="?/repairItem" use:enhance={handleRepair}>
									<input type="hidden" name="itemId" value={scanner.id} />
									<button type="submit" class="action-btn repair-btn">Repair</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty-state">No crafted scanners. Craft a Survey Scanner Module Mk I first.</p>
		{/if}
	</div>

	<!-- Thumper Parts -->
	<div class="gear-category">
		<h3>Thumper Parts</h3>
		
		<div class="equipped-parts">
			<p>
				<strong>Drill:</strong>
				{data.equippedThumperParts.drill?.displayName ?? 'none (worn basic)'}
				{#if data.equippedThumperParts.drill}
					— condition {data.equippedThumperParts.drill.condition}, 
					integrity {data.equippedThumperParts.drill.integrity}
				{/if}
			</p>
			<p>
				<strong>Pump:</strong>
				{data.equippedThumperParts.pump?.displayName ?? 'none (worn basic)'}
				{#if data.equippedThumperParts.pump}
					— condition {data.equippedThumperParts.pump.condition}, 
					integrity {data.equippedThumperParts.pump.integrity}
				{/if}
			</p>
			<p>
				<strong>Hull:</strong>
				{data.equippedThumperParts.hull?.displayName ?? 'none (worn basic)'}
				{#if data.equippedThumperParts.hull}
					— condition {data.equippedThumperParts.hull.condition}, 
					integrity {data.equippedThumperParts.hull.integrity}
				{/if}
			</p>
		</div>

		{#if repairFlash}
			<div class="inline-flash flash--{repairFlash.type}">
				{repairFlash.message}
				<button type="button" class="dismiss-btn" onclick={() => repairFlash = null}>×</button>
			</div>
		{/if}

		{#if data.thumperPartItems.length > 0}
			<ul class="item-list">
				{#each data.thumperPartItems as part}
					<li class="item-row">
						<div class="item-info">
							<span class="item-name">{part.displayName}</span>
							<span class="item-slot">({thumperPartSlotLabel(part.slot)})</span>
							<span class="item-stats">
								condition {part.condition}, integrity {part.integrity}
							</span>
						</div>
						<div class="item-actions">
							<form method="POST" action="?/equipThumperPart" use:enhance={handleEquipThumperPart}>
								<input type="hidden" name="slot" value={part.slot} />
								<input type="hidden" name="itemId" value={part.id} />
								<button type="submit" class="action-btn equip-btn">Equip</button>
							</form>
							{#if canRepairItem(part.condition, part.integrity)}
								<form method="POST" action="?/repairItem" use:enhance={handleRepair}>
									<input type="hidden" name="itemId" value={part.id} />
									<button type="submit" class="action-btn repair-btn">Repair</button>
								</form>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{:else}
			<p class="empty-state">No crafted thumper parts. Craft drill, pump, or hull parts first.</p>
		{/if}
	</div>
</section>

<style>
	.intro {
		color: #555;
		margin-bottom: 1.5rem;
	}

	/* Craft Section */
	.craft-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.schematic-list {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
	}

	.schematic-list h2 {
		margin: 0 0 0.75rem 0;
		font-size: 1.1rem;
	}

	.schematic-list ul {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.schematic-list li {
		margin: 0;
	}

	.schematic-list a {
		display: block;
		padding: 0.5rem 0.75rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 4px;
		text-decoration: none;
		color: #333;
		font-size: 0.9rem;
		transition: all 0.15s ease;
	}

	.schematic-list a:hover {
		border-color: #4a90d9;
		background: #f8fbff;
	}

	.schematic-list a[aria-current="page"] {
		background: #2c5aa0;
		color: white;
		border-color: #2c5aa0;
		font-weight: 500;
	}

	.workbench-area {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
	}

	.workbench-area h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	/* Inventory Panel */
	.inventory-panel {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.inventory-panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	.highlight-stack {
		background: #fff3cd;
		padding: 0.75rem;
		border-radius: 4px;
		margin: 0 0 1rem 0;
	}

	.empty-state {
		color: #666;
		font-style: italic;
		padding: 1rem 0;
	}

	.comparison-table {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.85rem;
	}

	.comparison-table th,
	.comparison-table td {
		border: 1px solid #ddd;
		padding: 0.5rem;
		text-align: left;
		vertical-align: top;
	}

	.comparison-table th {
		background: #e9ecef;
		font-weight: 600;
	}

	/* Gear Panel */
	.gear-panel {
		background: #f8f9fa;
		padding: 1rem;
		border-radius: 8px;
	}

	.gear-panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	.kit-count {
		font-size: 0.9rem;
		color: #444;
		margin: 0 0 1rem 0;
	}

	.gear-category {
		margin-bottom: 1.5rem;
	}

	.gear-category h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		border-bottom: 1px solid #ddd;
		padding-bottom: 0.5rem;
	}

	.equipped-info {
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}

	.equipped-parts {
		font-size: 0.85rem;
		color: #555;
		margin: 0 0 1rem 0;
	}

	.equipped-parts p {
		margin: 0.35rem 0;
	}

	/* Inline flashes */
	.inline-flash {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem;
		margin: 0.75rem 0;
		border-radius: 4px;
		font-size: 0.9rem;
	}

	.inline-flash.flash--success {
		background: #d4edda;
		color: #155724;
		border: 1px solid #c3e6cb;
	}

	.inline-flash.flash--error {
		background: #f8d7da;
		color: #721c24;
		border: 1px solid #f5c6cb;
	}

	.dismiss-btn {
		background: none;
		border: none;
		font-size: 1.25rem;
		cursor: pointer;
		padding: 0 0.25rem;
		color: inherit;
		opacity: 0.6;
	}

	.dismiss-btn:hover {
		opacity: 1;
	}

	/* Item list */
	.item-list {
		list-style: none;
		padding: 0;
		margin: 0;
	}

	.item-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 1rem;
		padding: 0.75rem;
		background: white;
		border: 1px solid #ddd;
		border-radius: 6px;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.item-row.equipped {
		border-color: #28a745;
		background: #f8fff8;
	}

	.item-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
		min-width: 200px;
	}

	.item-name {
		font-weight: 600;
	}

	.item-slot {
		font-size: 0.85rem;
		color: #666;
	}

	.item-stats {
		font-size: 0.8rem;
		color: #666;
	}

	.equipped-badge {
		font-size: 0.75rem;
		color: #28a745;
		font-weight: 600;
		text-transform: uppercase;
	}

	.item-actions {
		display: flex;
		gap: 0.5rem;
	}

	.action-btn {
		padding: 0.4rem 0.75rem;
		font-size: 0.85rem;
		border: 1px solid #ccc;
		border-radius: 4px;
		background: white;
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: #f0f0f0;
	}

	.action-btn.equip-btn {
		border-color: #2c5aa0;
		color: #2c5aa0;
	}

	.action-btn.equip-btn:hover {
		background: #eef4fc;
	}

	.action-btn.repair-btn {
		border-color: #b35900;
		color: #b35900;
	}

	.action-btn.repair-btn:hover {
		background: #fff8f0;
	}

	@media (min-width: 640px) {
		.craft-section {
			flex-direction: row;
		}

		.schematic-list {
			flex: 0 0 200px;
		}

		.workbench-area {
			flex: 1;
		}
	}
</style>
