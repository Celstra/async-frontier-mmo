<script lang="ts">
	import type { FieldMapView } from '@async-frontier-mmo/domain';

	interface Props {
		map: FieldMapView;
		mapFlash?: string | null;
		mapFlashKey?: number | null;
	}

	let { map, mapFlash = null, mapFlashKey = null }: Props = $props();
</script>

<div class="field-map">
	<div class="field-map__explore" aria-label="Deposit concentration field">
		{#if mapFlash}
			{#key mapFlashKey}
				<p class="field-map__flash" aria-live="polite">{mapFlash}</p>
			{/key}
		{/if}
		<div
			class="field-map__grid"
			style:--map-width={map.gridWidth}
			style:--map-height={map.gridHeight}
		>
			{#each map.rows as row}
				{#each row as cell}
					<span
					class="field-map__cell"
					class:field-map__cell--void={cell.char === ' '}
					class:field-map__cell--player={cell.char === '@'}
					class:field-map__cell--waypoint={cell.char === '▲'}
					class:field-map__cell--signal={cell.char === '~'}
					class:field-map__cell--dot={cell.char === '·'}
					>{cell.char === ' ' ? '·' : cell.char}</span
					>
				{/each}
			{/each}
		</div>
	</div>
	<aside class="field-map__readout panel-inset">
		<dl class="readout-list">
			<div>
				<dt>HERE</dt>
				<dd>{map.herePercent !== null ? `${map.herePercent}%` : '— scan tile'}</dd>
			</div>
			<div>
				<dt>Best scanned</dt>
				<dd>{map.bestScannedPercent !== null ? `${map.bestScannedPercent}%` : '—'}</dd>
			</div>
			<div>
				<dt>Range</dt>
				<dd>{map.rangeHint}</dd>
			</div>
		</dl>
	</aside>
</div>

<style>
	.field-map {
		display: grid;
		gap: 1rem;
	}

	@media (min-width: 640px) {
		.field-map {
			grid-template-columns: 1fr minmax(10rem, 14rem);
			align-items: start;
		}
	}

	.field-map__explore {
		position: relative;
		width: 100%;
		min-height: 26rem;
		padding: 0.75rem;
		display: flex;
		background: var(--bg-inset);
		border: 1px solid var(--phosphor-dim);
		border-radius: var(--radius-sm);
		box-shadow: inset 0 0 24px var(--phosphor-glow);
		overflow-x: auto;
	}

	.field-map__flash {
		position: absolute;
		left: 50%;
		top: 50%;
		z-index: 2;
		transform: translate(-50%, -50%);
		margin: 0;
		padding: 0.45rem 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		background: var(--bg-inset);
		border: 1px solid var(--phosphor-dim);
		border-radius: var(--radius-sm);
		box-shadow: 0 0 12px var(--phosphor-glow);
		pointer-events: none;
		animation: map-flash-fade 1.2s ease forwards;
	}

	@keyframes map-flash-fade {
		0%,
		70% {
			opacity: 1;
		}
		100% {
			opacity: 0;
		}
	}

	.field-map__grid {
		margin: 0;
		width: 100%;
		flex: 1;
		display: grid;
		grid-template-columns: repeat(var(--map-width), minmax(0, 1fr));
		grid-template-rows: repeat(var(--map-height), minmax(0, 1fr));
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1;
		letter-spacing: 0.08em;
		color: var(--text-secondary);
	}

	.field-map__cell {
		display: grid;
		place-items: center;
		min-width: 0;
		min-height: 0;
	}

	.field-map__cell--void {
		color: var(--text-muted);
		opacity: 0.15;
	}

	.field-map__cell--dot {
		color: var(--text-muted);
	}

	.field-map__cell--player {
		color: var(--phosphor);
		text-shadow: 0 0 6px var(--phosphor-glow);
	}

	.field-map__cell--waypoint {
		color: var(--accent-warning);
	}

	.field-map__cell--signal {
		color: var(--phosphor-dim);
	}

	.readout-list {
		margin: 0;
		display: grid;
		gap: 0.65rem;
	}

	.readout-list div {
		display: grid;
		gap: 0.15rem;
	}

	.readout-list dt {
		margin: 0;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		text-transform: uppercase;
		letter-spacing: 0.06em;
	}

	.readout-list dd {
		margin: 0;
		font-family: var(--font-mono);
		font-size: var(--font-size-md);
		color: var(--text-bright);
	}
</style>
