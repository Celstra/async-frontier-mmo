<script lang="ts">
	import { enhance } from '$app/forms';
	import { FABRICATOR_ONLINE } from '$lib/ascii';

	function handleKeydown(event: KeyboardEvent) {
		if (event.key.length === 1 || event.key === 'Enter' || event.key === ' ') {
			const form = document.getElementById('fabricator-dismiss') as HTMLFormElement | null;
			form?.requestSubmit();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="takeover" role="dialog" aria-modal="true" aria-labelledby="fabricator-title">
	<div class="takeover__panel">
		<pre class="takeover__art" aria-hidden="true">{FABRICATOR_ONLINE}</pre>
		<h2 id="fabricator-title" class="takeover__title">FABRICATOR ONLINE</h2>
		<p class="takeover__copy">The foreman’s rig schematic unlocks in WORKSHOP. Press any key to continue.</p>
		<form id="fabricator-dismiss" method="POST" action="?/dismissFabricator" use:enhance>
			<button type="submit" class="takeover__button">Continue</button>
		</form>
	</div>
</div>

<style>
	.takeover {
		position: fixed;
		inset: 0;
		z-index: 100;
		display: grid;
		place-items: center;
		padding: 1.5rem;
		background: rgba(4, 6, 4, 0.92);
	}

	.takeover__panel {
		max-width: 28rem;
		width: 100%;
		padding: 1.5rem;
		text-align: center;
		background: var(--bg-panel);
		border: 1px solid var(--phosphor-dim);
		box-shadow: 0 0 40px var(--phosphor-glow);
		border-radius: var(--radius-md);
	}

	.takeover__art {
		margin: 0 0 1rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		line-height: 1.2;
	}

	.takeover__title {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-lg);
		color: var(--phosphor);
		letter-spacing: 0.14em;
	}

	.takeover__copy {
		margin: 0 0 1.25rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
		line-height: 1.5;
	}

	.takeover__button {
		padding: 0.55rem 1.25rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--bg-base);
		background: var(--phosphor);
		border: none;
		border-radius: var(--radius-sm);
		cursor: pointer;
		letter-spacing: 0.06em;
	}
</style>
