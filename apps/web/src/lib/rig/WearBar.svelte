<script lang="ts">
	interface Props {
		label: string;
		/** Current condition or integrity (0–100). */
		value: number;
		/** Condition bars: craft Integrity cap. Ignored for integrity bars. */
		ceiling?: number;
		/** Condition uses integrity as cap; integrity always scales against 100. */
		kind?: 'condition' | 'integrity';
	}

	let { label, value, ceiling = 100, kind = 'condition' }: Props = $props();

	const isIntegrityBar = $derived(kind === 'integrity');

	const clampedValue = $derived(Math.max(0, Math.min(100, Math.round(value))));

	const clampedCeiling = $derived.by(() => {
		if (isIntegrityBar) {
			return 100;
		}
		return Math.max(clampedValue, Math.min(100, Math.round(ceiling)));
	});

	const greenWidth = $derived(clampedValue);
	const gapWidth = $derived(isIntegrityBar ? 0 : clampedCeiling - clampedValue);
	const capWidth = $derived(100 - clampedCeiling);

	const tone = $derived.by(() => {
		const basis = isIntegrityBar ? 100 : clampedCeiling;
		if (basis <= 0) return 'wear-bar__fill--low';
		const ratio = clampedValue / basis;
		return ratio >= 0.7 ? 'wear-bar__fill--ok' : ratio >= 0.35 ? 'wear-bar__fill--warn' : 'wear-bar__fill--low';
	});

	const showCapHint = $derived(!isIntegrityBar && clampedCeiling < 100);

	const ariaMax = $derived(isIntegrityBar ? 100 : clampedCeiling);
</script>

<div class="wear-bar">
	<div class="wear-bar__header">
		<span class="wear-bar__label">{label}</span>
		<span class="wear-bar__value">
			{clampedValue}%
			{#if showCapHint}
				<span class="wear-bar__cap">/ {clampedCeiling}% cap</span>
			{/if}
		</span>
	</div>
	<div
		class="wear-bar__track"
		role="progressbar"
		aria-valuenow={clampedValue}
		aria-valuemin={0}
		aria-valuemax={ariaMax}
		aria-label="{label} {clampedValue} percent"
	>
		{#if greenWidth > 0}
			<div
				class="wear-bar__segment wear-bar__segment--value {tone}"
				style:width="{greenWidth}%"
			></div>
		{/if}
		{#if gapWidth > 0}
			<div class="wear-bar__segment wear-bar__segment--gap" style:width="{gapWidth}%"></div>
		{/if}
		{#if capWidth > 0}
			<div class="wear-bar__segment wear-bar__segment--cap" style:width="{capWidth}%"></div>
		{/if}
	</div>
</div>

<style>
	.wear-bar {
		display: grid;
		gap: 0.25rem;
	}

	.wear-bar__header {
		display: flex;
		justify-content: space-between;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.wear-bar__value {
		color: var(--text-primary);
		font-variant-numeric: tabular-nums;
	}

	.wear-bar__cap {
		color: var(--text-muted);
	}

	.wear-bar__track {
		display: flex;
		height: 0.45rem;
		background: var(--bg-inset);
		border: 1px solid var(--border-subtle);
		border-radius: 999px;
		overflow: hidden;
	}

	.wear-bar__segment {
		height: 100%;
		flex-shrink: 0;
		transition: width 0.2s ease;
	}

	.wear-bar__segment--value {
		border-radius: 999px 0 0 999px;
	}

	.wear-bar__segment--gap,
	.wear-bar__segment--cap {
		background: var(--text-muted);
		opacity: 0.35;
	}

	.wear-bar__segment--cap {
		opacity: 0.22;
	}

	.wear-bar__fill--ok {
		background: var(--phosphor);
	}

	.wear-bar__fill--warn {
		background: var(--accent-warning);
	}

	.wear-bar__fill--low {
		background: var(--accent-danger);
	}
</style>
