<script lang="ts">
	import { FABRICATOR_POWER_READOUT } from '$lib/ascii';

	interface Props {
		/** Tighter layout for dialogs (settlement takeover). */
		compact?: boolean;
	}

	let { compact = false }: Props = $props();
</script>

<figure
	class="fabricator-bay"
	class:fabricator-bay--compact={compact}
	data-testid="fabricator-bay"
	aria-label="Fabricator bay"
>
	<div class="fabricator-bay__frame">
		<img
			class="fabricator-bay__image"
			src="/images/fabricator-bay.png?v=3"
			alt="Isometric fabricator gantry with conveyor and cyan status display"
			width="667"
			height="823"
			loading="lazy"
			decoding="async"
		/>
	</div>
	<p class="fabricator-bay__power" aria-label="Fabricator power readout">{FABRICATOR_POWER_READOUT}</p>
</figure>

<style>
	.fabricator-bay {
		margin: 0 0 0.25rem;
		max-width: 100%;
		text-align: center;
	}

	.fabricator-bay__frame {
		display: inline-block;
		max-width: min(100%, 22rem);
		line-height: 0;
	}

	.fabricator-bay--compact .fabricator-bay__frame {
		max-width: min(100%, 16rem);
	}

	.fabricator-bay__image {
		display: block;
		width: 100%;
		height: auto;
		image-rendering: pixelated;
		image-rendering: crisp-edges;
	}

	.fabricator-bay__power {
		margin: 0.5rem 0 0;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		line-height: 1.2;
		text-align: center;
		color: var(--phosphor);
		letter-spacing: 0.04em;
		text-shadow: 0 0 8px var(--phosphor-glow);
	}
</style>
