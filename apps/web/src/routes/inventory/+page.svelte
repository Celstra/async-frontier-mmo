<script lang="ts">
	import { enhance } from '$app/forms';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();
</script>

<p><a href="/">← Pilot Home</a></p>

<h1>Inventory</h1>

{#if data.needsFrameChoice}
	<p>Choose a frame on the Pilot Home page to view your inventory.</p>
{:else}
	<!-- Resources Section -->
	<section class="inventory-section">
		<h2>Resources</h2>
		{#if data.resourcesByFamily.length === 0}
			<p class="empty-state">No resources yet — survey and claim to fill inventory.</p>
		{:else}
			{#each data.resourcesByFamily as family}
				<details class="family-group" open>
					<summary>
						<span class="family-label">{family.familyLabel}</span>
						<span class="family-count">{family.stacks.length} type{family.stacks.length === 1 ? '' : 's'}</span>
					</summary>
					<div class="stacks-list">
						{#each family.stacks as stack}
							<div class="stack-card">
								<div class="stack-header">
									<span class="stack-name">{stack.displayName}</span>
									<span class="stack-quantity">× {stack.quantity}</span>
								</div>
								<span class="stack-slug">{stack.resourceSlug}</span>
							</div>
						{/each}
					</div>
				</details>
			{/each}
		{/if}
	</section>

	<!-- Repair Kits Section -->
	<section class="inventory-section">
		<h2>Repair Kits</h2>
		{#if data.repairKitCount === 0}
			<p class="empty-state">No repair kits — craft Field Repair Kits to repair damaged parts.</p>
		{:else}
			<div class="kit-display">
				<span class="kit-icon">🧰</span>
				<span class="kit-count">{data.repairKitCount}</span>
				<span class="kit-label">Field Repair Kit{data.repairKitCount === 1 ? '' : 's'}</span>
			</div>
		{/if}
	</section>

	<!-- Scanners Section -->
	<section class="inventory-section">
		<h2>Survey Scanners</h2>
		{#if data.scannerItems.length === 0}
			<p class="empty-state">No crafted scanners — craft Survey Scanner Module Mk I for better surveys.</p>
		{:else}
			<div class="gear-grid">
				{#each data.scannerItems as scanner}
					<div class="gear-card" class:gear-card--equipped={scanner.equipped}>
						<div class="gear-header">
							<span class="gear-name">{scanner.displayName}</span>
							{#if scanner.equipped}
								<span class="equipped-badge">Equipped</span>
							{/if}
						</div>
						<div class="gear-stats">
							<div class="gear-stat">
								<span class="stat-label">Condition</span>
								<span class="stat-value">{scanner.condition}%</span>
							</div>
							<div class="gear-stat">
								<span class="stat-label">Integrity</span>
								<span class="stat-value">{scanner.integrity}%</span>
							</div>
							<div class="gear-stat">
								<span class="stat-label">Survey Clarity</span>
								<span class="stat-value">{scanner.surveyClarity.toFixed(1)}</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Thumper Parts Section -->
	<section class="inventory-section">
		<h2>Thumper Parts</h2>
		{#if data.thumperParts.length === 0}
			<p class="empty-state">No crafted parts — craft drills, pumps, and hull plates to upgrade your thumper.</p>
		{:else}
			<div class="gear-grid">
				{#each data.thumperParts as part}
					<div class="gear-card" class:gear-card--equipped={part.equipped}>
						<div class="gear-header">
							<span class="gear-name">{part.displayName}</span>
							<span class="gear-slot">{part.slot}</span>
							{#if part.equipped}
								<span class="equipped-badge">Equipped</span>
							{/if}
						</div>
						<div class="gear-stats">
							<div class="gear-stat">
								<span class="stat-label">Condition</span>
								<span class="stat-value">{part.condition}%</span>
							</div>
							<div class="gear-stat">
								<span class="stat-label">Integrity</span>
								<span class="stat-value">{part.integrity}%</span>
							</div>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<p><a href="/craft">→ Crafting + Gear</a></p>

	{#if import.meta.env.DEV}
		<details class="dev-panel">
			<summary>Dev</summary>
			<pre>{JSON.stringify(data, null, 2)}</pre>
		</details>
	{/if}
{/if}

<style>
	.inventory-section {
		margin: 1.5rem 0;
		padding: 1rem;
		border: 1px solid #e5e7eb;
		border-radius: 0.5rem;
		background: white;
	}

	.inventory-section h2 {
		margin: 0 0 1rem 0;
		font-size: 1.125rem;
		color: #1f2937;
	}

	.empty-state {
		color: #6b7280;
		font-style: italic;
		margin: 0;
	}

	/* Family Groups */
	.family-group {
		margin: 0.75rem 0;
		border: 1px solid #e5e7eb;
		border-radius: 0.375rem;
	}

	.family-group summary {
		padding: 0.75rem;
		background: #f9fafb;
		cursor: pointer;
		display: flex;
		justify-content: space-between;
		align-items: center;
		user-select: none;
	}

	.family-label {
		font-weight: 600;
		color: #374151;
	}

	.family-count {
		font-size: 0.875rem;
		color: #6b7280;
		background: #e5e7eb;
		padding: 0.125rem 0.5rem;
		border-radius: 0.25rem;
	}

	.stacks-list {
		padding: 0.5rem;
		display: grid;
		gap: 0.5rem;
	}

	.stack-card {
		padding: 0.5rem 0.75rem;
		background: #f9fafb;
		border-radius: 0.25rem;
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stack-header {
		display: flex;
		gap: 0.5rem;
		align-items: center;
	}

	.stack-name {
		font-weight: 500;
		color: #1f2937;
	}

	.stack-quantity {
		color: #6b7280;
		font-variant-numeric: tabular-nums;
	}

	.stack-slug {
		font-size: 0.75rem;
		color: #9ca3af;
		font-family: monospace;
	}

	/* Repair Kits */
	.kit-display {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		background: #f0fdf4;
		border: 1px solid #bbf7d0;
		border-radius: 0.375rem;
	}

	.kit-icon {
		font-size: 1.5rem;
	}

	.kit-count {
		font-size: 1.5rem;
		font-weight: 700;
		color: #166534;
		font-variant-numeric: tabular-nums;
	}

	.kit-label {
		color: #15803d;
	}

	/* Gear Cards */
	.gear-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(16rem, 1fr));
		gap: 0.75rem;
	}

	.gear-card {
		padding: 0.875rem;
		border: 2px solid #e5e7eb;
		border-radius: 0.375rem;
		background: white;
	}

	.gear-card--equipped {
		border-color: #22c55e;
		background: #f0fdf4;
	}

	.gear-header {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		align-items: center;
		margin-bottom: 0.5rem;
		padding-bottom: 0.5rem;
		border-bottom: 1px solid #e5e7eb;
	}

	.gear-name {
		font-weight: 600;
		color: #1f2937;
		flex: 1;
	}

	.gear-slot {
		font-size: 0.75rem;
		color: #6b7280;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: #f3f4f6;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.equipped-badge {
		font-size: 0.625rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: #22c55e;
		color: white;
		padding: 0.125rem 0.375rem;
		border-radius: 0.25rem;
	}

	.gear-stats {
		display: grid;
		grid-template-columns: repeat(3, 1fr);
		gap: 0.5rem;
	}

	.gear-stat {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.stat-label {
		font-size: 0.625rem;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: #9ca3af;
	}

	.stat-value {
		font-size: 0.875rem;
		font-weight: 600;
		color: #374151;
		font-variant-numeric: tabular-nums;
	}
</style>
