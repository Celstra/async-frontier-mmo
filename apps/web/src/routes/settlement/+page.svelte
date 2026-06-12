<script lang="ts">
	import MissionOrderCard from '$lib/settlement/MissionOrderCard.svelte';
	import FabricatorTakeover from '$lib/settlement/FabricatorTakeover.svelte';
	import PrologueTakeover from '$lib/settlement/PrologueTakeover.svelte';
	import { SETTLEMENT_CAMP } from '$lib/ascii';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const activeOrder = $derived(
		data.activeOrderId ? data.orders.find((order) => order.id === data.activeOrderId) : null
	);

	const openOrders = $derived.by(() => {
		const open = data.orders.filter((order) => order.status === 'open');
		if (!data.activeOrderId) {
			return open;
		}

		return [
			...open.filter((order) => order.id === data.activeOrderId),
			...open.filter((order) => order.id !== data.activeOrderId)
		];
	});

	const filledOrders = $derived(data.orders.filter((order) => order.status === 'filled'));
</script>

<section class="screen" aria-label="Settlement console">
	<header class="screen__header settlement-header">SETTLEMENT — Foreman board</header>

	<div class="screen__body">
		<pre class="settlement-art" aria-hidden="true">{SETTLEMENT_CAMP}</pre>

		{#if form?.message}
			<p class="flash flash--error" role="alert">{form.message}</p>
		{/if}

		{#if data.activeMissionLine}
			<p class="mission-tracker" aria-live="polite">{data.activeMissionLine}</p>
		{/if}

		<aside class="foreman panel">
			<p class="foreman__label">FOREMAN</p>
			<p class="foreman__line">{data.foremanLine}</p>
		</aside>

		{#if data.showRecallLessonPrompt}
			<form method="POST" action="?/dismissRecallLesson" class="tutorial-beat">
				<button type="submit" class="action-row action-row--primary">
					Acknowledge recall — patch hull next
				</button>
			</form>
		{/if}

		{#if data.showHullPatchAction}
			<form method="POST" action="?/applyHullPatch" class="tutorial-beat">
				<button type="submit" class="action-row action-row--primary">
					Patch hull — restore to 30% condition &amp; integrity (free)
				</button>
			</form>
		{/if}

		{#if data.showAsyncDurationPicker}
			<section class="panel tutorial-beat" aria-label="Async deployment reveal">
				<p class="hint">Pick your first real run length — thumpers work while you’re away.</p>
				<div class="action-rows">
					{#each data.asyncTailOptions as option (option.id)}
						<form method="POST" action="?/chooseAsyncDuration">
							<input type="hidden" name="tailMinutes" value={option.minutes} />
							<button
								type="submit"
								class="action-row"
								disabled={!option.allowed}
								title={option.allowed
									? undefined
									: 'Your patched hull cannot run that long — craft a better hull in WORKSHOP'}
							>
								{option.label}
								{#if !option.allowed}
									<span class="action-row__lock"> — needs crafted hull</span>
								{/if}
							</button>
						</form>
					{/each}
				</div>
			</section>
		{/if}

		{#if activeOrder}
			<section class="current-mission panel" aria-label="Current mission">
				<p class="current-mission__eyebrow">Current mission</p>
				<p class="current-mission__family">{activeOrder.familyLabel}</p>
				<p class="current-mission__tracker">{activeOrder.tracker.line}</p>
				{#if activeOrder.boundResource}
					<div class="current-mission__commitment">
						<p class="current-mission__commitment-label">Bound to</p>
						<p class="current-mission__commitment-name">
							{activeOrder.boundResource.displayName}
							<span class="current-mission__commitment-bloom">
								· {activeOrder.boundResource.bloomLabel}
							</span>
						</p>
						<p class="current-mission__commitment-stats">
							{activeOrder.boundResource.turnedInUnits} turned in ·
							{activeOrder.boundResource.inventoryUnits} in inventory
							{#if activeOrder.boundResource.remainingUnits > 0}
								· {activeOrder.boundResource.remainingUnits} still needed
							{/if}
						</p>
						{#if activeOrder.boundResource.fieldNote}
							<p class="current-mission__commitment-note">
								{activeOrder.boundResource.fieldNote}
							</p>
						{/if}
					</div>
				{/if}
				<div
					class="current-mission__progress"
					role="progressbar"
					aria-valuenow={activeOrder.progressUnits}
					aria-valuemin={0}
					aria-valuemax={activeOrder.stackSize}
				>
					<div
						class="current-mission__progress-fill"
						style:width="{activeOrder.progressPercent}%"
					></div>
				</div>
				<p class="current-mission__progress-label">
					{activeOrder.progressUnits} / {activeOrder.stackSize} units toward order
					{#if activeOrder.deliveredUnits > 0}
						<span class="current-mission__turned-in">
							({activeOrder.deliveredUnits} turned in)
						</span>
					{/if}
				</p>
			</section>
		{/if}

		<section class="board" aria-label="All foreman orders">
			<header class="board__header">
				<h2 class="board__title">All foreman orders</h2>
				<p class="board__subtitle">{data.boardSummary}</p>
				<p class="board__meta">{data.milestoneLabel}</p>
			</header>

			{#if openOrders.length > 0}
				<div class="board__group">
					<h3 class="board__group-label">Open queue</h3>
					{#each openOrders as order (order.id)}
						<MissionOrderCard
							{order}
							isActive={order.id === data.activeOrderId}
							queueLabel={order.id === data.activeOrderId ? 'focus' : 'waiting'}
						/>
					{/each}
				</div>
			{/if}

			{#if filledOrders.length > 0}
				<details class="board__completed" open={openOrders.length === 0}>
					<summary class="board__completed-summary">
						Completed ({filledOrders.length})
					</summary>
					<div class="board__group board__group--filled">
						{#each filledOrders as order (order.id)}
							<MissionOrderCard {order} queueLabel="filled" compact />
						{/each}
					</div>
				</details>
			{/if}

			{#if openOrders.length === 0 && filledOrders.length === 0}
				<p class="hint">No orders posted for this milestone yet.</p>
			{/if}
		</section>
	</div>
</section>

{#if data.showPrologueTakeover}
	<PrologueTakeover />
{:else if data.showFabricatorTakeover}
	<FabricatorTakeover />
{/if}

<style>
	.mission-tracker {
		margin: 0 0 1rem;
		padding: 0.4rem 0.6rem;
		font-size: var(--font-size-sm);
		font-family: var(--font-mono);
		color: var(--phosphor);
		border-left: 2px solid var(--phosphor-dim);
		letter-spacing: 0.04em;
	}

	.settlement-header {
		margin: 0;
	}

	.settlement-art {
		margin: 0 0 1.25rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1.35;
		color: var(--phosphor);
		white-space: pre;
		overflow-x: auto;
	}

	.current-mission {
		margin-bottom: 1.25rem;
		border-color: var(--phosphor-dim);
		box-shadow: inset 0 0 20px var(--phosphor-glow);
	}

	.current-mission__eyebrow {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		letter-spacing: 0.14em;
		text-transform: uppercase;
	}

	.current-mission__family {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-sm);
		color: var(--text-bright);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.current-mission__tracker {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		line-height: 1.45;
	}

	.current-mission__commitment {
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.75rem;
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.current-mission__commitment-label {
		margin: 0 0 0.2rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.current-mission__commitment-name {
		margin: 0 0 0.25rem;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
	}

	.current-mission__commitment-bloom {
		color: var(--text-muted);
		font-size: var(--font-size-xs);
	}

	.current-mission__commitment-stats {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.current-mission__commitment-note {
		margin: 0.45rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		border-left: 2px solid var(--accent-warning-dim);
		padding-left: 0.5rem;
	}

	.current-mission__progress {
		height: 0.55rem;
		background: var(--bg-inset);
		border-radius: 999px;
		overflow: hidden;
		margin-bottom: 0.35rem;
	}

	.current-mission__progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--phosphor-dim), var(--phosphor));
		transition: width 0.3s ease;
	}

	.current-mission__progress-label {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.current-mission__turned-in {
		color: var(--text-secondary);
	}

	.foreman {
		margin-bottom: 1rem;
	}

	.foreman__label {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		letter-spacing: 0.1em;
	}

	.foreman__line {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		line-height: 1.5;
	}

	.board {
		display: grid;
		gap: 1rem;
	}

	.board__header {
		padding-bottom: 0.25rem;
		border-bottom: 1px solid var(--border-subtle);
	}

	.board__title {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.1em;
	}

	.board__subtitle {
		margin: 0 0 0.25rem;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		line-height: 1.45;
	}

	.board__meta {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		letter-spacing: 0.04em;
	}

	.board__group {
		display: grid;
		gap: 0.75rem;
	}

	.board__group-label {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}

	.board__completed {
		padding: 0.75rem 0 0;
		border-top: 1px solid var(--border-subtle);
	}

	.board__completed-summary {
		cursor: pointer;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		letter-spacing: 0.08em;
		text-transform: uppercase;
		user-select: none;
	}

	.board__completed-summary:hover {
		color: var(--phosphor);
	}

	.board__group--filled {
		margin-top: 0.75rem;
	}

	.panel {
		padding: 1rem;
		background: var(--bg-panel);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.hint {
		margin: 0;
		color: var(--text-muted);
		font-size: var(--font-size-sm);
	}

	.flash {
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-sm);
		margin-bottom: 1rem;
	}

	.flash--error {
		background: var(--accent-danger-dim);
		color: #ffd0d0;
	}
</style>
