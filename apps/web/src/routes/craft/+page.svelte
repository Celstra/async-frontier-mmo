<script lang="ts">
	import { enhance } from '$app/forms';
	import { familyDisplayLabel, thumperPartSlotLabel } from '$lib/displayLabels';
	import type { ResourceFamily } from '@async-frontier-mmo/domain';
	import CraftWorkbench from '$lib/craft/CraftWorkbench.svelte';
	import type { EquipCandidateComparison } from '$lib/server/craftLoad';
	import type { PageProps } from './$types';
	import type { SubmitFunction } from '@sveltejs/kit';

	const CRAFT_FRAMING =
		'Better gear closes the loop — a crafted scanner reads richer deposits on your next survey.';

	let { data, form }: PageProps = $props();

	// Inline flash states for equip/repair actions
	let equipFlash = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let repairFlash = $state<{ message: string; type: 'success' | 'error' } | null>(null);
	let celebratingCraft = $state(false);
	let gearPanelEl = $state<HTMLElement | null>(null);

	function scrollToBanner(bannerId: string) {
		requestAnimationFrame(() => {
			document.getElementById(bannerId)?.scrollIntoView({
				behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
					? 'auto'
					: 'smooth',
				block: 'start'
			});
		});
	}

	const craftOutcome = $derived(
		form && 'craftOutcome' in form ? form.craftOutcome : undefined
	);

	$effect(() => {
		if (craftOutcome) {
			celebratingCraft = true;
		}
	});

	$effect(() => {
		if (form?.message && !form?.craftOutcome) {
			requestAnimationFrame(() => {
				document.getElementById('craft-error')?.scrollIntoView({
					behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
						? 'auto'
						: 'smooth',
					block: 'start'
				});
			});
		}
	});

	function dismissCraftCelebration() {
		celebratingCraft = false;
	}

	const equipOutcome = $derived(
		form && 'equipOutcome' in form ? form.equipOutcome : undefined
	);
	const equipThumperOutcome = $derived(
		form && 'equipThumperOutcome' in form ? form.equipThumperOutcome : undefined
	);
	const repairOutcome = $derived(
		form && 'repairOutcome' in form ? form.repairOutcome : undefined
	);

	// Show flashes from form results — pinned at top so equip isn't missed at bottom of page
	$effect(() => {
		if (equipOutcome) {
			celebratingCraft = false;
			equipFlash = {
				message: `Equipped ${equipOutcome.displayName} — Survey Clarity ${equipOutcome.surveyClarity}. Ready for your next survey.`,
				type: 'success'
			};
			scrollToBanner('equip-banner');
		}
	});

	$effect(() => {
		if (equipThumperOutcome && 'displayName' in equipThumperOutcome) {
			celebratingCraft = false;
			equipFlash = {
				message: `Equipped ${equipThumperOutcome.displayName} (${thumperPartSlotLabel(equipThumperOutcome.slot)}) — condition ${equipThumperOutcome.condition}, integrity ${equipThumperOutcome.integrity}. Ready for your next thump.`,
				type: 'success'
			};
			scrollToBanner('equip-banner');
		}
	});

	$effect(() => {
		if (repairOutcome) {
			repairFlash = {
				message: `Repaired ${repairOutcome.displayName} — condition ${repairOutcome.condition}, integrity ${repairOutcome.integrity}. Kits remaining: ${repairOutcome.fieldRepairKitCount}`,
				type: 'success'
			};
			scrollToBanner('repair-banner');
		}
	});

	function canRepairItem(condition: number, integrity: number): boolean {
		return data.fieldRepairKitCount > 0 && (condition < 100 || integrity < 100);
	}

	function equipButtonLabel(
		keyPropertyDisplayName: string,
		equippedValue: number | null,
		candidate: EquipCandidateComparison
	): string {
		const from = equippedValue ?? 0;
		return `Equip — ${keyPropertyDisplayName} ${from} → ${candidate.value}`;
	}

	function deltaClass(delta: number | null): string {
		if (delta === null || delta === 0) return 'delta-neutral';
		return delta > 0 ? 'delta-positive' : 'delta-negative';
	}

	function formatDelta(delta: number | null): string {
		if (delta === null) return '';
		if (delta > 0) return `+${delta}`;
		return String(delta);
	}

	const handleEquip: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'failure') {
				equipFlash = { message: String(result.data?.message ?? 'Equip failed'), type: 'error' };
				scrollToBanner('equip-banner');
			}
		};
	};

	const handleRepair: SubmitFunction = () => {
		return async ({ result, update }) => {
			await update({ reset: false });
			if (result.type === 'failure') {
				repairFlash = { message: String(result.data?.message ?? 'Repair failed'), type: 'error' };
				scrollToBanner('repair-banner');
			}
		};
	};
</script>

<p><a href="/">← Pilot Home</a></p>

<h1>Crafting + Gear</h1>

<p class="craft-framing">{CRAFT_FRAMING}</p>

{#if form?.message && !form?.craftOutcome && !form?.equipOutcome && !form?.equipThumperOutcome && !form?.repairOutcome}
	<p class="flash flash--error" id="craft-error">{form.message}</p>
{/if}

{#if equipFlash}
	<div class="page-flash flash flash--{equipFlash.type}" id="equip-banner" role="status">
		{equipFlash.message}
		<button type="button" class="dismiss-btn" onclick={() => (equipFlash = null)} aria-label="Dismiss"
			>×</button
		>
	</div>
{/if}

{#if repairFlash}
	<div class="page-flash flash flash--{repairFlash.type}" id="repair-banner" role="status">
		{repairFlash.message}
		<button type="button" class="dismiss-btn" onclick={() => (repairFlash = null)} aria-label="Dismiss"
			>×</button
		>
	</div>
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
			schematicReadiness={data.schematicReadiness}
			onCelebrateDismiss={dismissCraftCelebration}
			onEquipCrafted={handleEquip}
		/>
	</div>
</section>

{#if !celebratingCraft}
<!-- Inventory Section -->
<section class="inventory-panel">
	<h2>Owned Resources</h2>
	<p class="inventory-help">
		Each schematic slot asks for a <strong>family</strong> (Conductive Metal, Structural Alloy, or
		Reactive Crystal). Any named resource in that family can fill a slot — you need enough units in
		<strong>one stack</strong>. Short a few? Thump the same resource again to top up that stack.
	</p>
	{#if data.veyrithStack}
		<p class="highlight-stack">
			<strong>Veyrith Copper</strong>
			<span class="family-pill">{familyDisplayLabel('conductive_metal')}</span>
			— {data.veyrithStack.quantity} units · conductivity {data.veyrithStack.stats.conductivity}, OQ
			{data.veyrithStack.stats.OQ}
		</p>
	{/if}
	{#if data.inventory.length === 0}
		<p class="empty-state">No stacks yet — claim a thumper run first.</p>
	{:else}
		<table class="comparison-table">
			<thead>
				<tr>
					<th>Resource</th>
					<th>Family</th>
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
						<td>
							<span class="family-pill">{familyDisplayLabel(hint.family as ResourceFamily)}</span>
						</td>
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
<section bind:this={gearPanelEl} class="gear-panel" id="gear-panel">
	<h2>Gear + Repair</h2>
	<p class="kit-count">Field Repair kits owned: {data.fieldRepairKitCount}</p>

	<!-- Scanners -->
	<div class="gear-category">
		<h3>Survey Scanners</h3>
		<p class="equipped-info">
			Equipped: <strong>{data.equippedScanner?.displayName ?? 'Basic Scanner Mk 0'}</strong>
		</p>

		{#if data.scannerItems.length > 0}
			{@const scannerComparison = data.equipComparisons.scanner}
			<ul class="item-list">
				{#each data.scannerItems as scanner}
					{@const candidate = scannerComparison?.candidates.find((row) => row.itemId === scanner.id)}
					<li class="item-row" class:equipped={scanner.equipped}>
						<div class="item-info">
							<span class="item-name">{scanner.displayName}</span>
							<span class="item-stats">
								{scannerComparison?.keyPropertyDisplayName ?? 'Survey Clarity'}
								{scanner.surveyClarity} · condition {scanner.condition} · integrity {scanner.integrity}
							</span>
							{#if scanner.equipped}
								<span class="equipped-badge">(equipped)</span>
							{/if}
						</div>
						<div class="item-actions">
							{#if !scanner.equipped && candidate && scannerComparison}
								<form method="POST" action="?/equipScanner" use:enhance={handleEquip}>
									<input type="hidden" name="itemId" value={scanner.id} />
									<button type="submit" class="action-btn equip-btn">
										{equipButtonLabel(
											scannerComparison.keyPropertyDisplayName,
											scannerComparison.equipped?.value ?? null,
											candidate
										)}
										{#if candidate.deltaVsEquipped !== null}
											<span class={deltaClass(candidate.deltaVsEquipped)}>
												({formatDelta(candidate.deltaVsEquipped)})
											</span>
										{/if}
									</button>
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


		{#if data.thumperPartItems.length > 0}
			<ul class="item-list">
				{#each data.thumperPartItems as part}
					{@const partComparison = data.equipComparisons.thumperParts[part.slot]}
					{@const candidate = partComparison?.candidates.find((row) => row.itemId === part.id)}
					<li class="item-row">
						<div class="item-info">
							<span class="item-name">{part.displayName}</span>
							<span class="item-slot">({thumperPartSlotLabel(part.slot)})</span>
							<span class="item-stats">
								{#if partComparison}
									{partComparison.keyPropertyDisplayName}
									{Math.round(part.propertyScores[partComparison.keyPropertyId] ?? 0)} ·
								{/if}
								condition {part.condition}, integrity {part.integrity}
							</span>
						</div>
						<div class="item-actions">
							{#if candidate && partComparison}
								<form method="POST" action="?/equipThumperPart" use:enhance={handleEquip}>
									<input type="hidden" name="slot" value={part.slot} />
									<input type="hidden" name="itemId" value={part.id} />
									<button type="submit" class="action-btn equip-btn">
										{equipButtonLabel(
											partComparison.keyPropertyDisplayName,
											partComparison.equipped?.value ?? null,
											candidate
										)}
										{#if candidate.deltaVsEquipped !== null}
											<span class={deltaClass(candidate.deltaVsEquipped)}>
												({formatDelta(candidate.deltaVsEquipped)})
											</span>
										{/if}
									</button>
								</form>
							{/if}
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
{/if}

<style>
	.gear-panel {
		scroll-margin-top: 1rem;
	}

	.craft-framing {
		margin: 0 0 1.25rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--accent-info-border, #3b5998);
		border-radius: 0.5rem;
		background: var(--accent-info-bg, #1a2332);
		color: var(--text-secondary, #c4c4c4);
		font-size: 0.95rem;
		line-height: 1.45;
	}

	/* Craft Section */
	.craft-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
		margin-bottom: 2rem;
	}

	.schematic-list {
		background: var(--surface-raised, #1a1a1a);
		border: 1px solid var(--border-subtle, #2e2e2e);
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
		background: var(--surface-inset, #2a2a2a);
		border: 1px solid var(--border-subtle, #2e2e2e);
		border-radius: 4px;
		text-decoration: none;
		color: var(--text-primary, #f3f4f6);
		font-size: 0.9rem;
		transition: all 0.15s ease;
	}

	.schematic-list a:hover {
		border-color: var(--accent-info, #60a5fa);
		background: var(--surface-hover, #1f1f1f);
	}

	.schematic-list a[aria-current="page"] {
		background: var(--accent-info-bg);
		color: var(--accent-info);
		border-color: var(--accent-info);
		font-weight: 500;
	}

	.workbench-area {
		background: var(--surface-raised, #1a1a1a);
		border: 1px solid var(--border-subtle, #2e2e2e);
		padding: 1rem;
		border-radius: 8px;
	}

	.workbench-area h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	/* Inventory Panel */
	.inventory-panel {
		background: var(--surface-raised, #1a1a1a);
		border: 1px solid var(--border-subtle, #2e2e2e);
		padding: 1rem;
		border-radius: 8px;
		margin-bottom: 2rem;
	}

	.inventory-panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	.inventory-help {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.family-pill {
		display: inline-block;
		margin-left: 0.35rem;
		padding: 0.1rem 0.45rem;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
		border-radius: 3px;
		background: var(--surface-inset);
		color: var(--text-muted);
		vertical-align: middle;
	}

	.highlight-stack {
		background: var(--accent-warning-bg);
		color: var(--accent-warning);
		padding: 0.75rem;
		border-radius: 4px;
		margin: 0 0 1rem 0;
	}

	.empty-state {
		color: var(--text-muted);
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
		border: 1px solid var(--border-subtle);
		padding: 0.5rem;
		text-align: left;
		vertical-align: top;
	}

	.comparison-table th {
		background: var(--surface-inset);
		font-weight: 600;
	}

	/* Gear Panel */
	.gear-panel {
		background: var(--surface-raised, #1a1a1a);
		border: 1px solid var(--border-subtle, #2e2e2e);
		padding: 1rem;
		border-radius: 8px;
	}

	.gear-panel h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
	}

	.kit-count {
		font-size: 0.9rem;
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
	}

	.gear-category {
		margin-bottom: 1.5rem;
	}

	.gear-category h3 {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		border-bottom: 1px solid var(--border-subtle);
		padding-bottom: 0.5rem;
	}

	.equipped-info {
		margin: 0 0 1rem 0;
		font-size: 0.9rem;
	}

	.equipped-parts {
		font-size: 0.85rem;
		color: var(--text-secondary);
		margin: 0 0 1rem 0;
	}

	.equipped-parts p {
		margin: 0.35rem 0;
	}

	.page-flash {
		display: flex;
		justify-content: space-between;
		align-items: center;
		gap: 0.75rem;
		margin: 0 0 1rem 0;
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
		background: var(--surface-inset, #2a2a2a);
		border: 1px solid var(--border-subtle, #2e2e2e);
		border-radius: 6px;
		margin-bottom: 0.5rem;
		flex-wrap: wrap;
	}

	.item-row.equipped {
		border-color: var(--accent-success, #4ade80);
		background: var(--accent-success-bg, #0f1f14);
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
		color: var(--text-muted);
	}

	.item-stats {
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.equipped-badge {
		font-size: 0.75rem;
		color: var(--accent-success);
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
		border: 1px solid var(--border-subtle);
		border-radius: 4px;
		background: var(--surface-raised);
		color: var(--text-primary);
		cursor: pointer;
		transition: all 0.15s ease;
	}

	.action-btn:hover {
		background: var(--surface-hover);
	}

	.action-btn.equip-btn {
		border-color: var(--accent-info);
		color: var(--accent-info);
	}

	.action-btn.equip-btn:hover {
		background: var(--accent-info-bg);
	}

	.delta-positive {
		color: var(--accent-success);
		font-weight: 700;
	}

	.delta-negative {
		color: var(--accent-danger);
		font-weight: 700;
	}

	.delta-neutral {
		color: var(--text-muted, #9ca3af);
	}

	.action-btn.repair-btn {
		border-color: var(--accent-warning);
		color: var(--accent-warning);
	}

	.action-btn.repair-btn:hover {
		background: var(--accent-warning-bg);
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
