<script lang="ts">
	import { enhance } from '$app/forms';
	import { PROLOGUE_LINES } from '$lib/copy/prologue';

	function isTypingTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		return target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTypingTarget(event.target)) return;
		const form = document.getElementById('prologue-continue') as HTMLFormElement | null;
		form?.requestSubmit();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

<section class="screen prologue" aria-label="Settlement briefing">
	<header class="screen__header">SETTLEMENT — Incoming brief</header>

	<div class="screen__body">
		<pre class="prologue__text" aria-label="Prologue">{PROLOGUE_LINES.join('\n')}</pre>

		<form id="prologue-continue" method="POST" action="?/continue" use:enhance class="prologue__form">
			<button type="submit" class="prologue__continue">Continue [any key]</button>
		</form>
	</div>
</section>

<style>
	.prologue__text {
		margin: 0 0 1.25rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1.6;
		color: var(--text-primary);
		white-space: pre-wrap;
	}

	.prologue__form {
		margin: 0;
	}

	.prologue__continue {
		width: 100%;
		text-align: left;
		padding: 0.65rem 0.75rem;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		color: var(--phosphor);
		background: var(--bg-inset);
		border: 1px solid var(--border-default);
		cursor: pointer;
	}

	.prologue__continue:hover {
		background: var(--bg-hover);
		border-color: var(--phosphor-dim);
	}
</style>
