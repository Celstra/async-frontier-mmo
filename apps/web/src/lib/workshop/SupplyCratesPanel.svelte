<script lang="ts">
	import { enhance } from '$app/forms';
	import { onMount } from 'svelte';
	import type { WorkshopSupplyState } from '$lib/server/workshopLoad';

	interface Props {
		supply: WorkshopSupplyState;
		onTimerDue?: () => void | Promise<void>;
	}

	let { supply, onTimerDue }: Props = $props();

	let openingCrateId = $state<string | null>(null);
	let openError = $state<string | null>(null);
	let expandedCrateId = $state<string | null>(null);
	let idempotencyKeys = $state<Record<string, string>>({});
	let currentTimeMs = $state<number | null>(null);
	let syncingTimerDue = $state(false);
	let lastSyncedTimerTarget = $state<string | null>(null);
	let expanded = $state(false);

	const readyCount = $derived(supply.availableCrates.length);
	const hasWaitingCrate = $derived(readyCount > 0);
	const shouldAutoExpandPanel = $derived(
		supply.availableCrates.some((crate) => crate.reason === 'emergency') ||
			(!supply.canCraftAnyThumperPart && hasWaitingCrate)
	);

	function crateIdempotencyKey(crateId: string): string {
		return idempotencyKeys[crateId] ?? '';
	}

	$effect.pre(() => {
		const crateIds = new Set(supply.availableCrates.map((crate) => crate.id));
		let next = idempotencyKeys;
		let changed = false;

		for (const crateId of crateIds) {
			if (!next[crateId]) {
				next = { ...next, [crateId]: `${Date.now()}-${crateId}` };
				changed = true;
			}
		}

		for (const crateId of Object.keys(next)) {
			if (!crateIds.has(crateId)) {
				if (!changed) {
					next = { ...next };
				}
				delete next[crateId];
				changed = true;
			}
		}

		if (changed) {
			idempotencyKeys = next;
		}
	});

	function remainingMs(targetIso: string | null, nowMs: number | null): number | null {
		if (!targetIso || nowMs === null) return null;
		return new Date(targetIso).getTime() - nowMs;
	}

	function formatCountdown(targetIso: string | null, nowMs: number | null): string {
		const remaining = remainingMs(targetIso, nowMs);
		if (remaining === null) return 'Scheduling…';
		if (remaining <= 0) return syncingTimerDue ? 'Syncing crate…' : 'Crate ready — syncing…';
		const totalSeconds = Math.ceil(remaining / 1000);
		const minutes = Math.floor(totalSeconds / 60);
		const seconds = totalSeconds % 60;
		return `${minutes}:${seconds.toString().padStart(2, '0')}`;
	}

	const countdownLabel = $derived(
		hasWaitingCrate ? 'Open crate to resume' : formatCountdown(supply.nextTimedCrateAt, currentTimeMs)
	);

	const bannerStatus = $derived(
		hasWaitingCrate
			? `${readyCount} ready`
			: `Next ${countdownLabel}`
	);

	function craftsUntilMilestone(): number {
		return Math.max(0, supply.craftCountCrateInterval - supply.craftCountSinceCrate);
	}

	function togglePreview(crateId: string) {
		expandedCrateId = expandedCrateId === crateId ? null : crateId;
	}

	function toggleExpanded() {
		expanded = !expanded;
	}

	$effect(() => {
		if (shouldAutoExpandPanel) {
			expanded = true;
		}
	});

	$effect(() => {
		if (hasWaitingCrate) {
			return;
		}

		const target = supply.nextTimedCrateAt;
		const remaining = remainingMs(target, currentTimeMs);
		if (!target || remaining === null || remaining > 0 || !onTimerDue) {
			return;
		}
		if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
			return;
		}
		if (lastSyncedTimerTarget === target || syncingTimerDue) {
			return;
		}

		syncingTimerDue = true;
		lastSyncedTimerTarget = target;
		void Promise.resolve(onTimerDue()).finally(() => {
			syncingTimerDue = false;
		});
	});

	onMount(() => {
		const tick = () => {
			currentTimeMs = Date.now();
		};
		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});
</script>

<section class="supply-panel" aria-label="Workshop supply crates">
	<button
		type="button"
		class="supply-banner"
		class:supply-banner--ready={hasWaitingCrate}
		aria-expanded={expanded}
		data-testid="supply-drop-banner"
		onclick={toggleExpanded}
	>
		<span class="supply-banner__title">Supply drop</span>
		<span class="supply-banner__status" class:supply-banner__status--ready={hasWaitingCrate}>
			{bannerStatus}
		</span>
		<span class="supply-banner__chevron" aria-hidden="true">{expanded ? '▾' : '▸'}</span>
	</button>

	{#if expanded}
		<div class="supply-panel__body">
			<div class="supply-panel__timer">
				<p>
					<span class="supply-panel__label">Next timed crate</span>
					<span class="supply-panel__value" class:supply-panel__value--paused={hasWaitingCrate}>
						{countdownLabel}
					</span>
				</p>
				<p class="supply-panel__hint">
					Every {supply.timerCrateMinutes} minutes while this tab is visible. Only one timed crate can
					wait unopened — open it before the next one accrues.
				</p>
				<p class="supply-panel__hint">
					Craft milestone: {supply.craftCountSinceCrate}/{supply.craftCountCrateInterval}
					{#if craftsUntilMilestone() > 0}
						· {craftsUntilMilestone()} craft{craftsUntilMilestone() === 1 ? '' : 's'} until bonus crate
					{:else}
						· milestone crate due on next completed craft
					{/if}
				</p>
				{#if !supply.canCraftAnyThumperPart}
					<p class="supply-panel__stuck" role="status">
						Bench stock cannot craft any thumper part right now. Reclaim prototypes or open a crate.
					</p>
				{/if}
			</div>

			{#if openError}
				<p class="supply-panel__error" role="alert">{openError}</p>
			{/if}

			{#if supply.availableCrates.length === 0}
				<p class="supply-panel__empty">No crates ready to open.</p>
			{:else}
				<ul class="supply-panel__crate-list">
					{#each supply.availableCrates as crate (crate.id)}
						<li class="supply-panel__crate">
							<div class="supply-panel__crate-head">
								<div>
									<p class="supply-panel__crate-reason">{crate.reasonLabel}</p>
									<p class="supply-panel__crate-meta">Crate #{crate.sequence}</p>
								</div>
								<button
									type="button"
									class="supply-panel__preview-btn"
									onclick={() => togglePreview(crate.id)}
								>
									{expandedCrateId === crate.id ? 'Hide payload' : 'Preview'}
								</button>
							</div>

							{#if expandedCrateId === crate.id}
								<ul class="supply-panel__payload">
									{#each crate.payload as line}
										<li>
											<p class="supply-panel__payload-name">
												{line.displayName} · {line.quantity}u
											</p>
											<p class="supply-panel__payload-stats">
												{#each line.stats as stat}
													<span>{stat.key} {stat.value} ({stat.band})</span>
												{/each}
											</p>
										</li>
									{/each}
								</ul>
							{/if}

							<form
								method="POST"
								action="?/openCrate"
								use:enhance={() => {
									openingCrateId = crate.id;
									openError = null;
									return async ({ result, update }) => {
										await update({ reset: false });
										openingCrateId = null;
										if (result.type === 'success') {
											expandedCrateId = null;
										} else if (result.type === 'failure') {
											const message = result.data?.message;
											openError =
												typeof message === 'string' ? message : 'Crate open failed — try again.';
										}
									};
								}}
							>
								<input type="hidden" name="crateId" value={crate.id} />
								<input
									type="hidden"
									name="idempotencyKey"
									value={crateIdempotencyKey(crate.id)}
								/>
								<button
									type="submit"
									class="supply-panel__open-btn"
									disabled={openingCrateId === crate.id}
								>
									{openingCrateId === crate.id ? 'Opening…' : 'Open crate'}
								</button>
							</form>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>

<style>
	.supply-panel {
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-panel);
		overflow: hidden;
	}

	.supply-banner {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		width: 100%;
		padding: 0.5rem 0.65rem;
		border: none;
		background: var(--bg-inset);
		color: var(--text-primary);
		font-family: inherit;
		font-size: inherit;
		text-align: left;
		cursor: pointer;
	}

	.supply-banner:hover {
		background: var(--bg-hover);
	}

	.supply-banner--ready {
		background: var(--phosphor-glow);
		border-bottom: 1px solid rgba(74, 222, 128, 0.25);
	}

	.supply-banner__title {
		flex-shrink: 0;
		font-size: var(--font-size-xs);
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.08em;
		color: var(--phosphor);
	}

	.supply-banner__status {
		flex: 1;
		min-width: 0;
		font-size: 0.75rem;
		color: var(--text-muted);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.supply-banner__status--ready {
		color: var(--phosphor);
		font-weight: 600;
	}

	.supply-banner__chevron {
		flex-shrink: 0;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.supply-panel__body {
		padding: 0.65rem 0.75rem 0.75rem;
	}

	.supply-panel__timer {
		margin-bottom: 0.65rem;
		padding: 0.55rem 0.65rem;
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.supply-panel__label {
		display: block;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--phosphor);
	}

	.supply-panel__value {
		display: block;
		margin-top: 0.2rem;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--text-bright);
	}

	.supply-panel__value--paused {
		color: var(--accent-warning);
		font-size: 0.85rem;
	}

	.supply-panel__hint,
	.supply-panel__empty {
		margin: 0.35rem 0 0;
		font-size: 0.75rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.supply-panel__stuck {
		margin: 0.5rem 0 0;
		padding: 0.5rem 0.6rem;
		border-radius: var(--radius-sm);
		border: 1px solid rgba(251, 191, 36, 0.45);
		background: rgba(251, 191, 36, 0.08);
		color: var(--accent-warning);
		font-size: 0.75rem;
	}

	.supply-panel__error {
		margin: 0 0 0.65rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		color: var(--accent-warning);
		font-size: 0.8rem;
	}

	.supply-panel__crate-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.5rem;
	}

	.supply-panel__crate {
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.supply-panel__crate-head {
		display: flex;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: flex-start;
		margin-bottom: 0.5rem;
	}

	.supply-panel__crate-reason {
		margin: 0;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-bright);
	}

	.supply-panel__crate-meta {
		margin: 0.15rem 0 0;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.supply-panel__preview-btn {
		flex-shrink: 0;
		padding: 0.25rem 0.45rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-hover);
		color: var(--text-primary);
		font-size: var(--font-size-xs);
		cursor: pointer;
	}

	.supply-panel__payload {
		margin: 0 0 0.55rem;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.4rem;
	}

	.supply-panel__payload-name {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-bright);
	}

	.supply-panel__payload-stats {
		margin: 0.15rem 0 0;
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
		font-size: 0.7rem;
		color: var(--text-muted);
	}

	.supply-panel__open-btn {
		width: 100%;
		padding: 0.55rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--phosphor);
		color: var(--bg-base);
		font-weight: 600;
		font-size: 0.85rem;
		cursor: pointer;
	}

	.supply-panel__open-btn:disabled {
		opacity: 0.7;
		cursor: wait;
	}
</style>
