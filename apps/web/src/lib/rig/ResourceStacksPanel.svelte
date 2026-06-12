<script lang="ts">
	import ResourceQualityGrid from '$lib/field/ResourceQualityGrid.svelte';
	import type { RigResourceFamilyGroup } from '$lib/server/rigLoad';

	interface Props {
		resourcesByFamily: RigResourceFamilyGroup[];
	}

	let { resourcesByFamily }: Props = $props();

	let expandedStackId = $state<string | null>(null);

	function toggleStack(resourceInstanceId: string) {
		expandedStackId = expandedStackId === resourceInstanceId ? null : resourceInstanceId;
	}
</script>

<section class="stacks panel">
	<h2 class="panel__title">Resource stacks</h2>
	<p class="stacks__hint">Tap a stack to review quality stats.</p>

	{#if resourcesByFamily.length === 0}
		<p class="stacks__empty">No resources yet — survey and claim on FIELD.</p>
	{:else}
		{#each resourcesByFamily as family (family.familyId)}
			<details class="stacks__family" open>
				<summary>
					<span>{family.familyLabel}</span>
					<span class="stacks__count">{family.stacks.length}</span>
				</summary>
				<ul class="stacks__list">
					{#each family.stacks as stack (stack.resourceInstanceId)}
						<li class="stacks__item">
							<button
								type="button"
								class="stacks__row"
								class:stacks__row--expanded={expandedStackId === stack.resourceInstanceId}
								aria-expanded={expandedStackId === stack.resourceInstanceId}
								onclick={() => toggleStack(stack.resourceInstanceId)}
							>
								<span class="stacks__name">{stack.displayName}</span>
								<span class="stacks__qty">{stack.quantity}u</span>
							</button>

							{#if expandedStackId === stack.resourceInstanceId}
								<div class="stacks__detail">
									{#if stack.statsRevealed && stack.stats}
										<p class="stacks__detail-label">Quality breakdown</p>
										<ResourceQualityGrid stats={stack.stats} compact />
									{:else}
										<p class="stacks__locked">
											Quality hidden — sample this resource on FIELD to reveal its five
											stats.
										</p>
									{/if}
								</div>
							{/if}
						</li>
					{/each}
				</ul>
			</details>
		{/each}
	{/if}
</section>

<style>
	.stacks__hint {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.stacks__empty {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-muted);
	}

	.stacks__family {
		margin-bottom: 0.5rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.stacks__family summary {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		padding: 0.55rem 0.75rem;
		cursor: pointer;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.stacks__count {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.stacks__list {
		list-style: none;
		margin: 0;
		padding: 0 0.5rem 0.65rem;
		display: grid;
		gap: 0.35rem;
	}

	.stacks__item {
		display: grid;
		gap: 0;
	}

	.stacks__row {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		width: 100%;
		padding: 0.45rem 0.5rem;
		border: 1px solid transparent;
		border-radius: var(--radius-sm);
		background: transparent;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		cursor: pointer;
		text-align: left;
	}

	.stacks__row:hover,
	.stacks__row--expanded {
		border-color: var(--phosphor-dim);
		background: var(--bg-panel);
		color: var(--text-primary);
	}

	.stacks__name {
		color: inherit;
	}

	.stacks__qty {
		color: var(--phosphor);
		font-variant-numeric: tabular-nums;
	}

	.stacks__detail {
		margin: 0 0.5rem 0.35rem;
		padding: 0.55rem 0.6rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
	}

	.stacks__detail-label {
		margin: 0 0 0.45rem;
		font-size: 0.65rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.stacks__locked {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		line-height: 1.45;
	}
</style>
