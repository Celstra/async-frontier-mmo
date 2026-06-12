<script lang="ts">
	import type { RigResourceFamilyGroup } from '$lib/server/rigLoad';

	interface Props {
		resourcesByFamily: RigResourceFamilyGroup[];
	}

	let { resourcesByFamily }: Props = $props();
</script>

<section class="stacks panel">
	<h2 class="panel__title">Resource stacks</h2>

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
						<li>
							<span>{stack.displayName}</span>
							<span class="stacks__qty">{stack.quantity}u</span>
						</li>
					{/each}
				</ul>
			</details>
		{/each}
	{/if}
</section>

<style>
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
		padding: 0 0.75rem 0.65rem;
		display: grid;
		gap: 0.35rem;
	}

	.stacks__list li {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.stacks__qty {
		color: var(--phosphor);
		font-variant-numeric: tabular-nums;
	}
</style>
