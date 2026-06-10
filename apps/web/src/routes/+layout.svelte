<script lang="ts">
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import { isHomeActive, isNavStageActive, LOOP_NAV_STAGES } from '$lib/layout/loopNav';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	const pathname = $derived(page.url.pathname);
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<div class="app-shell">
	<header class="loop-nav-header">
		<nav class="loop-nav" aria-label="Core loop">
			<a href="/" class="loop-nav__link" class:loop-nav__link--active={isHomeActive(pathname)}>
				Home
			</a>
			<span class="loop-nav__sep" aria-hidden="true">·</span>
			{#each LOOP_NAV_STAGES as stage, index (stage.id)}
				{#if index > 0}
					<span class="loop-nav__sep" aria-hidden="true">→</span>
				{/if}
				{#if stage.nonLink}
					<span
						class="loop-nav__label"
						class:loop-nav__label--active={isNavStageActive(stage, pathname)}
					>
						{stage.label}
					</span>
				{:else}
					<a
						href={stage.href}
						class="loop-nav__link"
						class:loop-nav__link--active={isNavStageActive(stage, pathname)}
					>
						{stage.label}
						{#if stage.id === 'run' && data.runBadge === 'active'}
							<span class="run-badge" title="Thumper run in progress">active</span>
						{/if}
					</a>
				{/if}
			{/each}
		</nav>
	</header>

	<main class="app-main">
		{@render children()}
	</main>
</div>

<style>
	:global(body) {
		margin: 0;
		font-family:
			system-ui,
			-apple-system,
			BlinkMacSystemFont,
			'Segoe UI',
			Roboto,
			'Helvetica Neue',
			Arial,
			sans-serif;
		line-height: 1.6;
		color: #1a1a1a;
		background: #fafafa;
	}

	:global(.flash) {
		margin: 0.75rem 0;
		padding: 0.65rem 0.85rem;
		border: 1px solid #c8c8c8;
		border-radius: 0.35rem;
		background: #f5f5f5;
	}

	:global(.flash--success) {
		border-color: #6b9e6b;
		background: #eef6ee;
		color: #1f4d1f;
	}

	:global(.flash--error) {
		border-color: #c96a6a;
		background: #fdf0f0;
		color: #6b1f1f;
	}

	:global(details.dev-panel) {
		margin: 0.75rem 0;
		padding: 0.5rem 0.75rem;
		border: 1px dashed #b0b0b0;
		border-radius: 0.35rem;
		background: #f0f0f0;
		font-family:
			ui-monospace,
			SFMono-Regular,
			'SF Mono',
			Menlo,
			Consolas,
			monospace;
		font-size: 0.85rem;
		color: #555;
	}

	:global(details.dev-panel > summary) {
		cursor: pointer;
		user-select: none;
	}

	.app-shell {
		max-width: 52rem;
		margin: 0 auto;
		padding: 1rem 1.25rem 2rem;
	}

	.loop-nav-header {
		margin-bottom: 1.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid #ddd;
	}

	.loop-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.35rem 0.5rem;
		font-size: 0.9rem;
		line-height: 1.4;
	}

	.loop-nav__sep {
		color: #888;
		font-size: 0.8rem;
		user-select: none;
	}

	.loop-nav__link,
	.loop-nav__label {
		text-decoration: none;
		color: #2a5a8a;
		white-space: nowrap;
	}

	.loop-nav__link:hover {
		text-decoration: underline;
	}

	.loop-nav__link--active,
	.loop-nav__label--active {
		color: #1a1a1a;
		font-weight: 600;
		text-decoration: none;
	}

	.loop-nav__label {
		color: #777;
	}

	.loop-nav__label--active {
		color: #1a1a1a;
	}

	.run-badge {
		display: inline-block;
		margin-left: 0.3rem;
		padding: 0.05rem 0.35rem;
		border-radius: 0.25rem;
		font-size: 0.7rem;
		font-weight: 600;
		line-height: 1.3;
		text-transform: lowercase;
		color: #1f4d1f;
		background: #d8edd8;
		border: 1px solid #6b9e6b;
		vertical-align: middle;
	}

	.app-main {
		min-height: 0;
	}
</style>
