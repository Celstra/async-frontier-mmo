<script lang="ts">
	interface Props {
		progressPercent: number;
		segments?: number;
		direction?: 'fill' | 'drain';
		blinkActive?: boolean;
	}

	let {
		progressPercent,
		segments = 10,
		direction = 'fill',
		blinkActive = false
	}: Props = $props();

	const clampedPercent = $derived(Math.min(100, Math.max(0, progressPercent)));

	const filledCount = $derived.by(() => {
		if (direction === 'fill') {
			return Math.min(segments, Math.ceil((clampedPercent / 100) * segments));
		}
		return Math.max(0, segments - Math.ceil((clampedPercent / 100) * segments));
	});

	const activeSegmentIndex = $derived.by(() => {
		if (filledCount <= 0) return 0;
		if (filledCount >= segments) return segments - 1;
		return filledCount - 1;
	});
</script>

<div class="segmented-bar" role="progressbar" aria-valuenow={clampedPercent} aria-valuemin={0} aria-valuemax={100}>
	<div class="segmented-bar__track">
		{#each { length: segments } as _, index (index)}
			<span
				class="segmented-bar__segment"
				class:segmented-bar__segment--filled={index < filledCount}
				class:segmented-bar__segment--blink={blinkActive && index === activeSegmentIndex}
			></span>
		{/each}
	</div>
</div>

<style>
	.segmented-bar__track {
		display: flex;
		gap: 3px;
		padding: 3px;
		border: 1px solid var(--phosphor-dim);
		border-radius: var(--radius-sm);
	}

	.segmented-bar__segment {
		flex: 1;
		height: 0.55rem;
		min-width: 0.4rem;
		border-radius: 1px;
		background: var(--bg-inset);
		transition: background-color 0.15s ease;
	}

	.segmented-bar__segment--filled {
		background: var(--phosphor);
		box-shadow: 0 0 4px var(--phosphor-glow);
	}

	.segmented-bar__segment--blink {
		animation: segment-blink 0.9s ease-in-out infinite;
	}

	@keyframes segment-blink {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.35;
		}
	}
</style>
