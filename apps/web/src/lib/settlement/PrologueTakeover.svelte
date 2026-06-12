<script lang="ts">
	import { enhance } from '$app/forms';
	import { PROLOGUE_LINES } from '$lib/copy/prologue';

	function handleKeydown(event: KeyboardEvent) {
		if (event.key.length === 1 || event.key === 'Enter' || event.key === ' ') {
			const form = document.getElementById('prologue-dismiss') as HTMLFormElement | null;
			form?.requestSubmit();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<div class="takeover" role="dialog" aria-modal="true" aria-labelledby="prologue-title">
	<div class="takeover__panel">
		<p id="prologue-title" class="takeover__eyebrow">Incoming brief</p>
		<pre class="takeover__text">{PROLOGUE_LINES.join('\n')}</pre>
		<form id="prologue-dismiss" method="POST" action="?/dismissPrologue" use:enhance>
			<button type="submit" class="takeover__button">Continue [any key]</button>
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
		max-width: 32rem;
		width: 100%;
		padding: 1.5rem;
		background: var(--bg-panel);
		border: 1px solid var(--phosphor-dim);
		box-shadow: 0 0 40px var(--phosphor-glow);
		border-radius: 4px;
	}

	.takeover__eyebrow {
		margin: 0 0 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--phosphor);
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.takeover__text {
		margin: 0 0 1.25rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		color: var(--text-primary);
		white-space: pre-wrap;
	}

	.takeover__button {
		width: 100%;
		padding: 0.55rem 1rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--bg-base);
		background: var(--phosphor);
		border: none;
		border-radius: 4px;
		cursor: pointer;
		letter-spacing: 0.06em;
		text-align: left;
	}
</style>
