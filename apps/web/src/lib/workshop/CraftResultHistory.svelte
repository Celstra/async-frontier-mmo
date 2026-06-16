<script lang="ts">
	import { enhance } from '$app/forms';
	import type { WorkshopSchematicCraftHistory } from '$lib/server/workshopLoad';

	interface Props {
		history: WorkshopSchematicCraftHistory | null;
		highlightItemId?: string | null;
	}

	let { history, highlightItemId = null }: Props = $props();

	let reclaimItemId = $state<string | null>(null);
	let reclaimError = $state<string | null>(null);
	let reclaiming = $state(false);
	let reclaimIdempotencyKey = $state(`${Date.now()}-history-reclaim`);

	function formatScore(score: number): string {
		return Math.round(score).toString();
	}

	function openReclaim(craftItemId: string) {
		reclaimItemId = craftItemId;
		reclaimError = null;
		reclaimIdempotencyKey = `${Date.now()}-history-reclaim`;
	}

	function reclaimPreviewFor(itemId: string) {
		return history?.crafts.find((craft) => craft.itemId === itemId)?.reclaimPreview ?? [];
	}

	function reclaimTargetFavorited(itemId: string): boolean {
		return history?.crafts.find((craft) => craft.itemId === itemId)?.favorited ?? false;
	}
</script>

{#if history && history.crafts.length > 0}
	<section class="craft-history" aria-label="Craft history for {history.displayName}">
		<header class="craft-history__header">
			<h3 class="craft-history__title">Craft history</h3>
			<p class="craft-history__subtitle">{history.displayName}</p>
		</header>

		<div class="craft-history__summary">
			{#if history.lastCraft}
				<p>
					<span class="craft-history__label">Last</span>
					{history.lastCraft.displayName}
					<span class="craft-history__score">{formatScore(history.lastCraft.totalScore)}</span>
				</p>
			{/if}
			{#if history.bestCraft}
				<p>
					<span class="craft-history__label">Best</span>
					{history.bestCraft.displayName}
					<span class="craft-history__score">{formatScore(history.bestCraft.totalScore)}</span>
				</p>
			{/if}
		</div>

		<ul class="craft-history__list">
			{#each history.crafts as craft (craft.itemId)}
				<li
					class="craft-history__item"
					class:craft-history__item--highlight={craft.itemId === highlightItemId}
					class:craft-history__item--favorited={craft.favorited}
				>
					<div class="craft-history__item-main">
						<p class="craft-history__item-name">
							{craft.displayName}
							{#if craft.favorited}
								<span class="craft-history__kept">Kept</span>
							{/if}
						</p>
						<p class="craft-history__item-meta">
							Score {formatScore(craft.totalScore)} · Condition {craft.condition} · Integrity
							{craft.integrity}
						</p>
					</div>

					<div class="craft-history__actions">
						<form
							method="POST"
							action="?/toggleFavorite"
							use:enhance={() => {
								return async ({ update }) => {
									await update({ reset: false });
								};
							}}
						>
							<input type="hidden" name="itemId" value={craft.itemId} />
							<input type="hidden" name="favorited" value={craft.favorited ? 'false' : 'true'} />
							<button type="submit" class="craft-history__btn">
								{craft.favorited ? 'Unkeep' : 'Keep'}
							</button>
						</form>
						<button
							type="button"
							class="craft-history__btn craft-history__btn--reclaim"
							onclick={() => openReclaim(craft.itemId)}
						>
							Reclaim
						</button>
					</div>

					{#if reclaimItemId === craft.itemId}
						<div class="craft-history__reclaim-preview">
							<h4>Reclaim preview</h4>
							{#if craft.favorited}
								<p class="craft-history__reclaim-warning" role="alert">
									This prototype is kept. Reclaiming destroys it and returns partial bench stock.
								</p>
							{:else}
								<p>Breaking down returns partial bench stock. This cannot be undone.</p>
							{/if}
							<ul>
								{#each reclaimPreviewFor(craft.itemId) as line}
									<li>{line.resourceDisplayName}: {line.quantity}u</li>
								{/each}
							</ul>
							{#if reclaimError}
								<p class="craft-history__reclaim-error" role="alert">{reclaimError}</p>
							{/if}
							<form
								method="POST"
								action="?/reclaimItem"
								use:enhance={() => {
									reclaiming = true;
									reclaimError = null;
									return async ({ result, update }) => {
										await update({ reset: false });
										reclaiming = false;
										if (result.type === 'success') {
											reclaimItemId = null;
										} else if (result.type === 'failure') {
											const message = result.data?.message;
											reclaimError =
												typeof message === 'string'
													? message
													: 'Reclaim failed — try again.';
										}
									};
								}}
							>
								<input type="hidden" name="itemId" value={craft.itemId} />
								<input type="hidden" name="idempotencyKey" value={reclaimIdempotencyKey} />
								<input type="hidden" name="previewed" value="true" />
								{#if reclaimTargetFavorited(craft.itemId)}
									<input type="hidden" name="confirmFavorited" value="true" />
								{/if}
								<button
									type="submit"
									class="craft-history__confirm-btn"
									disabled={reclaiming}
								>
									Confirm reclaim
								</button>
							</form>
							<button
								type="button"
								class="craft-history__btn"
								onclick={() => (reclaimItemId = null)}
							>
								Cancel
							</button>
						</div>
					{/if}
				</li>
			{/each}
		</ul>
	</section>
{/if}

<style>
	.craft-history {
		margin-bottom: 1rem;
		padding: 0.85rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-md);
		background: var(--bg-panel);
	}

	.craft-history__header {
		margin-bottom: 0.75rem;
	}

	.craft-history__title {
		margin: 0;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--phosphor);
	}

	.craft-history__subtitle {
		margin: 0.25rem 0 0;
		font-size: 0.9rem;
		color: var(--text-bright);
	}

	.craft-history__summary {
		margin-bottom: 0.75rem;
		padding: 0.65rem 0.75rem;
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
		font-size: 0.85rem;
		color: var(--text-secondary);
	}

	.craft-history__summary p {
		margin: 0.2rem 0;
	}

	.craft-history__label {
		display: inline-block;
		min-width: 2.5rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--phosphor);
	}

	.craft-history__score {
		margin-left: 0.35rem;
		font-weight: 600;
		color: var(--text-bright);
	}

	.craft-history__list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: grid;
		gap: 0.5rem;
	}

	.craft-history__item {
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
	}

	.craft-history__item--highlight {
		border-color: var(--phosphor-dim);
		box-shadow: 0 0 0 1px var(--phosphor-glow);
	}

	.craft-history__item--favorited {
		border-color: rgba(74, 222, 128, 0.35);
	}

	.craft-history__item-main {
		min-width: 0;
		margin-bottom: 0.5rem;
	}

	.craft-history__item-name {
		margin: 0 0 0.2rem;
		font-size: 0.9rem;
		color: var(--text-bright);
	}

	.craft-history__kept {
		margin-left: 0.35rem;
		padding: 0.1rem 0.35rem;
		border-radius: 999px;
		background: var(--phosphor-glow);
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		color: var(--phosphor);
	}

	.craft-history__item-meta {
		margin: 0;
		font-size: 0.8rem;
		color: var(--text-muted);
	}

	.craft-history__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem;
	}

	.craft-history__btn {
		padding: 0.35rem 0.55rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-hover);
		color: var(--text-primary);
		font-size: var(--font-size-xs);
		cursor: pointer;
	}

	.craft-history__btn--reclaim {
		border-color: rgba(251, 191, 36, 0.45);
		color: var(--accent-warning);
	}

	.craft-history__reclaim-preview {
		margin-top: 0.65rem;
		padding-top: 0.65rem;
		border-top: 1px solid var(--border-subtle);
	}

	.craft-history__reclaim-preview h4 {
		margin: 0 0 0.35rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		color: var(--accent-warning);
	}

	.craft-history__reclaim-preview p,
	.craft-history__reclaim-preview li {
		margin: 0.15rem 0;
		font-size: 0.8rem;
		color: var(--text-secondary);
	}

	.craft-history__reclaim-preview ul {
		margin: 0.35rem 0 0.65rem;
		padding-left: 1.1rem;
	}

	.craft-history__reclaim-warning,
	.craft-history__reclaim-error {
		color: var(--accent-warning) !important;
		font-weight: 600;
	}

	.craft-history__confirm-btn {
		width: 100%;
		margin-bottom: 0.35rem;
		padding: 0.55rem;
		border: none;
		border-radius: var(--radius-sm);
		background: var(--accent-warning);
		color: var(--bg-base);
		font-weight: 600;
		cursor: pointer;
	}
</style>
