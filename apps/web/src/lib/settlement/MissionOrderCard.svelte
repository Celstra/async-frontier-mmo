<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SettlementOrderCard } from '$lib/server/settlementLoad';

	interface Props {
		order: SettlementOrderCard;
		isActive?: boolean;
		queueLabel?: 'focus' | 'waiting' | 'filled';
		compact?: boolean;
	}

	let { order, isActive = false, queueLabel, compact = false }: Props = $props();

	const badgeLabel = $derived(
		queueLabel === 'focus'
			? 'Current focus'
			: queueLabel === 'waiting'
				? 'Also waiting'
				: queueLabel === 'filled'
					? 'Complete'
					: null
	);
</script>

<article
	class="order-card panel"
	class:order-card--active={isActive}
	class:order-card--waiting={queueLabel === 'waiting'}
	class:order-card--filled={queueLabel === 'filled'}
	class:order-card--compact={compact}
>
	<header class="order-card__header">
		<div class="order-card__title-row">
			<h3 class="order-card__family">{order.familyLabel}</h3>
			{#if badgeLabel}
				<span
					class="order-card__badge"
					class:order-card__badge--focus={queueLabel === 'focus'}
					class:order-card__badge--waiting={queueLabel === 'waiting'}
					class:order-card__badge--filled={queueLabel === 'filled'}
				>
					{badgeLabel}
				</span>
			{/if}
		</div>
		<span class="order-card__status" class:order-card__status--filled={order.status === 'filled'}>
			{order.status === 'filled' ? 'Filled' : 'Open'}
		</span>
	</header>

	<p class="order-card__tracker">{order.tracker.line}</p>

	{#if order.reserveNoticeLine}
		<p class="order-card__reserve-notice">{order.reserveNoticeLine}</p>
	{/if}

	{#if order.boundResource}
		<div
			class="order-card__commitment"
			class:order-card__commitment--rotated={order.boundResource.fieldStatus === 'rotated_off'}
		>
			<p class="order-card__commitment-label">Your commitment</p>
			<p class="order-card__commitment-name">{order.boundResource.displayName}</p>
			<p class="order-card__commitment-meta">{order.boundResource.bloomLabel}</p>
			<p class="order-card__commitment-stats">
				{order.boundResource.turnedInUnits} turned in · {order.boundResource.inventoryUnits} in
				inventory
				{#if order.boundResource.remainingUnits > 0}
					· {order.boundResource.remainingUnits} still needed
				{/if}
			</p>
			{#if order.boundResource.fieldNote}
				<p class="order-card__commitment-note">{order.boundResource.fieldNote}</p>
			{/if}
			{#if order.status === 'open' && order.boundResource.inventoryUnits > 0 && order.boundInstanceId}
				<form method="POST" action="?/turnIn" use:enhance class="order-card__turn-in">
					<input type="hidden" name="orderId" value={order.id} />
					<input type="hidden" name="resourceInstanceId" value={order.boundInstanceId} />
					<button type="submit" class="action-row">
						Turn in {order.boundResource.inventoryUnits}u from inventory
					</button>
				</form>
			{/if}
		</div>
	{/if}

	{#if !compact && order.tracker.kind === 'bound' && order.tracker.nudge}
		<p class="order-card__nudge">{order.tracker.nudge}</p>
	{/if}

	<div
		class="order-card__progress"
		role="progressbar"
		aria-valuenow={order.progressUnits}
		aria-valuemin={0}
		aria-valuemax={order.stackSize}
	>
		<div class="order-card__progress-fill" style:width="{order.progressPercent}%"></div>
	</div>
	<p class="order-card__progress-label">
		{order.progressUnits} / {order.stackSize} units toward order
		{#if order.deliveredUnits > 0 && order.deliveredUnits !== order.progressUnits}
			<span class="order-card__turned-in">({order.deliveredUnits} turned in)</span>
		{/if}
	</p>

	{#if order.status === 'open' && !compact && !order.boundInstanceId}
		<div class="order-card__stacks">
			<p class="order-card__stacks-label">Eligible stacks</p>
			{#each order.eligibleStacks as stack (stack.resourceInstanceId)}
				<form method="POST" action="?/turnIn" use:enhance class="stack-row">
					<input type="hidden" name="orderId" value={order.id} />
					<input type="hidden" name="resourceInstanceId" value={stack.resourceInstanceId} />
					<button type="submit" class="action-row" disabled={!stack.selectable}>
						<span class="stack-row__name">{stack.displayName}</span>
						<span class="stack-row__qty">{stack.quantity}u</span>
						{#if stack.disabledReason}
							<span class="stack-row__reason">— {stack.disabledReason}</span>
						{/if}
					</button>
				</form>
			{:else}
				<p class="hint">No stacks in inventory — sample and claim on FIELD first.</p>
			{/each}
		</div>
	{/if}
</article>

<style>
	.order-card {
		padding: 1rem;
		background: var(--bg-panel);
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
	}

	.order-card--active {
		border-color: var(--phosphor-dim);
	}

	.order-card--waiting {
		opacity: 0.88;
		border-style: dashed;
	}

	.order-card--filled {
		opacity: 0.65;
		background: var(--bg-inset);
	}

	.order-card--compact {
		padding: 0.75rem 1rem;
	}

	.order-card__header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		gap: 0.75rem;
		margin-bottom: 0.5rem;
	}

	.order-card__title-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.65rem;
		min-width: 0;
	}

	.order-card__family {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
		letter-spacing: 0.06em;
		text-transform: uppercase;
	}

	.order-card__badge {
		font-size: var(--font-size-xs);
		letter-spacing: 0.06em;
		text-transform: uppercase;
		padding: 0.1rem 0.4rem;
		border-radius: var(--radius-sm);
		border: 1px solid var(--border-subtle);
	}

	.order-card__badge--focus {
		color: var(--phosphor);
		border-color: var(--phosphor-dim);
	}

	.order-card__badge--waiting {
		color: var(--text-secondary);
	}

	.order-card__badge--filled {
		color: var(--text-muted);
	}

	.order-card__status {
		flex-shrink: 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		letter-spacing: 0.06em;
	}

	.order-card__status--filled {
		color: var(--phosphor-dim);
	}

	.order-card__tracker {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-sm);
		color: var(--text-primary);
	}

	.order-card__commitment {
		margin: 0 0 0.75rem;
		padding: 0.6rem 0.75rem;
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
	}

	.order-card__commitment--rotated {
		border-color: var(--accent-warning-dim);
	}

	.order-card__commitment-label {
		margin: 0 0 0.25rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.order-card__commitment-name {
		margin: 0;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
	}

	.order-card__commitment-meta {
		margin: 0.15rem 0 0.35rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.order-card__commitment-stats {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.order-card__commitment-note {
		margin: 0.45rem 0 0;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		border-left: 2px solid var(--accent-warning-dim);
		padding-left: 0.5rem;
	}

	.order-card__turn-in {
		margin-top: 0.65rem;
	}

	.order-card__turn-in .action-row {
		width: 100%;
	}

	.order-card__nudge {
		margin: 0 0 0.65rem;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		border-left: 2px solid var(--accent-warning-dim);
		padding-left: 0.5rem;
	}

	.order-card__reserve-notice {
		margin: 0 0 0.65rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		line-height: 1.45;
	}

	.order-card__progress {
		height: 0.5rem;
		background: var(--bg-inset);
		border-radius: 999px;
		overflow: hidden;
		margin-bottom: 0.35rem;
	}

	.order-card__progress-fill {
		height: 100%;
		background: linear-gradient(90deg, var(--phosphor-dim), var(--phosphor));
		transition: width 0.3s ease;
	}

	.order-card__progress-label {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		font-variant-numeric: tabular-nums;
	}

	.order-card__turned-in {
		color: var(--text-secondary);
	}

	.order-card--compact .order-card__progress-label {
		margin-bottom: 0;
	}

	.order-card__stacks-label {
		margin: 0 0 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.08em;
	}

	.stack-row {
		margin-bottom: 0.35rem;
	}

	.action-row {
		width: 100%;
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 0.35rem 0.75rem;
		text-align: left;
		padding: 0.55rem 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--text-primary);
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		cursor: pointer;
	}

	.action-row:hover:not(:disabled) {
		background: var(--bg-hover);
		border-color: var(--border-strong);
	}

	.action-row:disabled {
		opacity: 0.55;
		cursor: not-allowed;
	}

	.stack-row__name {
		flex: 1 1 10rem;
	}

	.stack-row__qty {
		color: var(--phosphor);
		font-variant-numeric: tabular-nums;
	}

	.stack-row__reason {
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.hint {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}
</style>
