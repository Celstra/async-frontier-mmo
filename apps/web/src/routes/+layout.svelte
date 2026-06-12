<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import favicon from '$lib/assets/favicon.svg';
	import '$lib/theme.css';
	import type { LayoutData } from './$types';

	let { children, data }: { children: import('svelte').Snippet; data: LayoutData } = $props();

	type SliceScreenId = 'field' | 'settlement' | 'workshop' | 'rig';

	const SLICE_NAV = [
		{ id: 'field' as const, label: '[F]IELD', href: '/field', shortcut: 'f' },
		{ id: 'settlement' as const, label: '[S]ETTLEMENT', href: '/settlement', shortcut: 's' },
		{ id: 'workshop' as const, label: '[W]ORKSHOP', href: '/workshop', shortcut: 'w' },
		{ id: 'rig' as const, label: '[R]IG', href: '/rig', shortcut: 'r' }
	];

	const pathname = $derived(page.url.pathname);

	const nextActionScreen = $derived(data.nextActionScreen);

	const missionTicker = $derived(data.missionTicker);

	function isScreenActive(href: string): boolean {
		return pathname === href || pathname.startsWith(`${href}/`);
	}

	function isTypingTarget(target: EventTarget | null): boolean {
		if (!(target instanceof HTMLElement)) return false;
		const tag = target.tagName;
		return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable;
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.metaKey || event.ctrlKey || event.altKey) return;
		if (isTypingTarget(event.target)) return;

		const key = event.key.toLowerCase();
		const screen = SLICE_NAV.find((item) => item.shortcut === key);
		if (!screen) return;

		event.preventDefault();
		void goto(screen.href);
	}
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

<svelte:window onkeydown={handleKeydown} />

<div class="app-shell">
	<header class="console-header">
		<nav class="slice-nav" aria-label="Settlement console">
			{#each SLICE_NAV as screen (screen.id)}
				<a
					href={screen.href}
					class="slice-nav__link"
					class:slice-nav__link--active={isScreenActive(screen.href)}
					class:slice-nav__link--next={nextActionScreen === screen.id}
					aria-current={isScreenActive(screen.href) ? 'page' : undefined}
				>
					{screen.label}
				</a>
			{/each}
		</nav>

		{#if missionTicker}
			<p class="mission-ticker" aria-live="polite">{missionTicker}</p>
		{/if}
	</header>

	<main class="app-main">
		{@render children()}
	</main>
</div>

<style>
	.app-shell {
		max-width: var(--shell-max-width);
		margin: 0 auto;
		padding: 1rem 1.25rem 2rem;
	}

	.console-header {
		margin-bottom: 1.25rem;
		padding-bottom: 0.75rem;
		border-bottom: 1px solid var(--border-default);
	}

	.slice-nav {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 0.5rem 1rem;
		font-size: var(--font-size-sm);
		line-height: var(--nav-height);
	}

	.slice-nav__link {
		text-decoration: none;
		color: var(--text-muted);
		letter-spacing: 0.06em;
		padding: 0.2rem 0.35rem;
		border: 1px solid transparent;
		white-space: nowrap;
	}

	.slice-nav__link:hover {
		color: var(--phosphor);
		text-decoration: none;
		border-color: var(--border-subtle);
		background: var(--bg-hover);
	}

	.slice-nav__link--active {
		color: var(--phosphor);
		border-color: var(--border-default);
		background: var(--bg-inset);
		box-shadow: inset 0 0 12px var(--phosphor-glow);
	}

	.slice-nav__link--next {
		color: var(--accent-warning);
		border-color: var(--accent-warning-dim);
	}

	.slice-nav__link--next::after {
		content: ' ←';
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
	}

	.mission-ticker {
		margin: 0.5rem 0 0;
		padding: 0.35rem 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		border-left: 2px solid var(--phosphor-dim);
		letter-spacing: 0.04em;
	}

	.app-main {
		min-height: 0;
	}
</style>
