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
			<a
				href="/"
				class="loop-nav__link"
				class:loop-nav__link--active={isHomeActive(pathname)}
				aria-current={isHomeActive(pathname) ? 'page' : undefined}
			>
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
						aria-current={isNavStageActive(stage, pathname) ? 'step' : undefined}
					>
						{stage.label}
					</span>
				{:else}
					<a
						href={stage.href}
						class="loop-nav__link"
						class:loop-nav__link--active={isNavStageActive(stage, pathname)}
						class:loop-nav__link--run-active={stage.id === 'run' && data.runBadge === 'active' && isNavStageActive(stage, pathname)}
						class:loop-nav__link--run-claimable={stage.id === 'run' && data.runBadge === 'claimable'}
						aria-current={isNavStageActive(stage, pathname) ? 'page' : undefined}
					>
						{stage.label}
						{#if stage.id === 'run' && data.runBadge === 'active'}
							<span class="run-badge run-badge--active" title="Thumper run in progress">running</span>
						{:else if stage.id === 'run' && data.runBadge === 'claimable'}
							<span class="run-badge run-badge--claimable" title="Thumper ready to claim"
								>ready to claim</span
							>
						{/if}
					</a>
				{/if}
			{/each}
			<span class="loop-nav__sep" aria-hidden="true">·</span>
			<a
				href="/inventory"
				class="loop-nav__link"
				class:loop-nav__link--active={pathname === '/inventory'}
				aria-current={pathname === '/inventory' ? 'page' : undefined}
			>
				Inventory
			</a>
		</nav>
	</header>

	<main class="app-main">
		{@render children()}
	</main>
</div>

<style>
	:global(:root) {
		color-scheme: dark;
		--text-primary: #f3f4f6;
		--text-secondary: #c4c4c4;
		--text-muted: #9aa0a8;
		--surface-base: #0f0f0f;
		--surface-raised: #1a1a1a;
		--surface-hover: #252525;
		--surface-inset: #2a2a2a;
		--border-subtle: #333;
		--border-muted: #555;
		--accent-info: #60a5fa;
		--accent-info-bg: #152238;
		--accent-info-border: #3b5998;
		--accent-success: #4ade80;
		--accent-success-bg: #0f2918;
		--accent-success-text: #86efac;
		--accent-warning: #fbbf24;
		--accent-warning-bg: #2a2208;
		--accent-danger: #f87171;
		--accent-danger-bg: #2a1515;
		--accent-danger-border: #7f1d1d;
	}

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
		color: var(--text-primary);
		background: var(--surface-base);
	}

	:global(a) {
		color: var(--accent-info);
	}

	:global(a:hover) {
		color: var(--accent-info);
		text-decoration: underline;
	}

	:global(button),
	:global(input),
	:global(select),
	:global(textarea) {
		color: var(--text-primary);
	}

	:global(input),
	:global(select),
	:global(textarea) {
		background: var(--surface-raised);
		border: 1px solid var(--border-subtle);
	}

	:global(h1, h2, h3) {
		color: var(--text-primary);
	}

	:global(.flash) {
		margin: 0.75rem 0;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--border-muted);
		border-radius: 0.35rem;
		background: var(--surface-raised);
	}

	:global(.flash--success) {
		border-color: #166534;
		background: var(--accent-success-bg);
		color: var(--accent-success-text);
	}

	:global(.flash--error) {
		border-color: var(--accent-danger-border);
		background: var(--accent-danger-bg);
		color: var(--accent-danger);
	}

	:global(details.dev-panel) {
		margin: 1.5rem 0 0.75rem;
		padding: 0.5rem 0.75rem;
		border: 1px dashed var(--border-muted);
		border-radius: 0.35rem;
		background: var(--surface-raised);
		font-family:
			ui-monospace,
			SFMono-Regular,
			'SF Mono',
			Menlo,
			Consolas,
			monospace;
		font-size: 0.85rem;
		color: var(--text-muted);
	}

	:global(details.dev-panel > summary) {
		cursor: pointer;
		user-select: none;
	}

	:global(button) {
		font-family: inherit;
	}

	.app-shell {
		max-width: 52rem;
		margin: 0 auto;
		padding: 1rem 1.25rem 2rem;
	}

	.loop-nav-header {
		margin-bottom: 1.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-subtle);
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
		color: var(--text-muted);
		font-size: 0.8rem;
		user-select: none;
	}

	.loop-nav__link,
	.loop-nav__label {
		text-decoration: none;
		color: var(--text-muted);
		white-space: nowrap;
		padding: 0.15rem 0.25rem;
		border-radius: 0.25rem;
	}

	.loop-nav__link:hover {
		color: var(--text-primary);
		text-decoration: none;
		background: var(--surface-hover);
	}

	.loop-nav__link--active,
	.loop-nav__label--active {
		color: var(--text-primary);
		font-weight: 700;
		text-decoration: none;
		background: var(--surface-raised);
		box-shadow: inset 0 0 0 1px var(--border-muted);
	}

	.loop-nav__link--run-active.loop-nav__link--active {
		box-shadow: inset 0 0 0 1px #3b82f6;
		background: #151d28;
	}

	.loop-nav__link--run-claimable {
		color: var(--accent-success);
		font-weight: 600;
	}

	.loop-nav__link--run-claimable.loop-nav__link--active {
		background: var(--accent-success-bg);
		box-shadow: inset 0 0 0 2px var(--accent-success);
	}

	.loop-nav__label {
		color: var(--text-muted);
	}

	.loop-nav__label--active {
		color: var(--text-primary);
		font-weight: 700;
		background: var(--surface-raised);
		box-shadow: inset 0 0 0 1px var(--border-muted);
	}

	.run-badge {
		display: inline-block;
		margin-left: 0.3rem;
		padding: 0.1rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.68rem;
		font-weight: 700;
		line-height: 1.3;
		text-transform: lowercase;
		vertical-align: middle;
		letter-spacing: 0.02em;
	}

	.run-badge--active {
		color: var(--accent-info);
		background: var(--accent-info-bg);
		border: 1px solid var(--accent-info-border);
	}

	.run-badge--claimable {
		color: #052e16;
		background: var(--accent-success);
		border: 1px solid var(--accent-success);
		animation: claimable-glow 2s ease-in-out infinite;
	}

	@media (prefers-reduced-motion: no-preference) {
		@keyframes claimable-glow {
			0%,
			100% {
				box-shadow: 0 0 0 0 rgba(74, 222, 128, 0);
			}
			50% {
				box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.25);
			}
		}
	}

	.app-main {
		min-height: 0;
	}
</style>
