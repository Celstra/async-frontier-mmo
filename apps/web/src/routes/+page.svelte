<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { formatDuration } from '$lib/formatDuration';
	import EnergyBar from '$lib/field/EnergyBar.svelte';
	import { familyDisplayLabel } from '$lib/displayLabels';
	import type { HubTile } from '$lib/pilotHome';
	import type { PageProps } from './$types';
	import type { ResourceStatCode } from 'shared';

	let { data, form }: PageProps = $props();

	const resourceStatCodes: ResourceStatCode[] = [
		'OQ',
		'conductivity',
		'hardness',
		'heat_resistance',
		'malleability'
	];
	const thumperDemo = $derived(data.thumperDemo ?? null);
	const openRun = $derived(data.openRun ?? null);
	const hubTiles = $derived(data.hubTiles ?? []);
	const bloomRotation = $derived(form?.bloomRotation ?? null);
	const hasCompletedTutorial = $derived(
		form?.hasCompletedTutorial ?? data.hasCompletedTutorial ?? false
	);
	const needsFrameChoice = $derived(data.needsFrameChoice ?? false);
	const frameChoiceOptions = $derived(data.frameChoiceOptions ?? []);
	const frameLabel = $derived(data.frameLabel ?? '');
	const frameVerb = $derived(data.frameVerb ?? '');
	const activeBloomName = $derived(data.activeBloomName ?? '');
	const suggestedNextAction = $derived(data.suggestedNextAction ?? null);

	const thumperTile = $derived(hubTiles.find((tile): tile is HubTile & { id: 'thumper' } => tile.id === 'thumper'));
	const thumperSource = $derived(data.thumperDemo ? 'load' : 'none');

	const HUB_TILE_TITLES: Record<HubTile['id'], string> = {
		thumper: 'My Thumper',
		survey: 'Survey Red Mesa',
		workbench: 'Workbench',
		storage: 'Storage'
	};

	const HUB_TILE_ICONS: Record<HubTile['id'], string> = {
		thumper: '⛏',
		survey: '◎',
		workbench: '⚙',
		storage: '▤'
	};

	const FAMILY_ORDER = ['conductive_metal', 'structural_alloy', 'reactive_crystal'] as const;

	let displaySeconds = $state<number | null>(null);

	$effect(() => {
		const remaining = thumperTile?.secondsRemaining ?? thumperDemo?.secondsRemaining ?? null;
		const isActive =
			thumperTile?.state === 'active' || thumperDemo?.status === 'active';

		if (!isActive || remaining === null) {
			displaySeconds = remaining;
			return;
		}

		displaySeconds = remaining;

		const intervalId = setInterval(() => {
			if (displaySeconds === null) return;

			if (displaySeconds <= 1) {
				displaySeconds = 0;
				clearInterval(intervalId);
				void invalidateAll();
				return;
			}

			displaySeconds -= 1;
		}, 1000);

		return () => clearInterval(intervalId);
	});

	function thumperBadge(tile: HubTile & { id: 'thumper' }): string | null {
		if (tile.state === 'ready_to_claim') return 'READY!';
		if (tile.state === 'active') return 'RUNNING';
		return null;
	}

	function thumperHeadline(tile: HubTile & { id: 'thumper' }): string {
		if (tile.state === 'idle') return 'No thumper deployed';
		if (tile.state === 'ready_to_claim') return 'Haul ready — collect it';
		return tile.headline;
	}

	function thumperDetail(tile: HubTile & { id: 'thumper' }): string {
		if (tile.state === 'idle') return 'Survey to find a signal, then deploy.';
		if (tile.state === 'active' && displaySeconds !== null) {
			return `${formatDuration(displaySeconds)} remaining · ${tile.detail}`;
		}
		return tile.detail;
	}

	function formatPartCondition(part: { displayName: string; condition: number }): string {
		return `${part.displayName} (${part.condition}%)`;
	}
</script>

<h1>Pilot Home</h1>

{#if needsFrameChoice}
	<section class="frame-choice">
		<h2>Choose your frame</h2>
		<p>How do you operate on the frontier?</p>
		{#if form?.message}
			<p class="flash flash--error">{form.message}</p>
		{/if}
		<form method="POST" action="?/chooseFrame" use:enhance>
			{#each frameChoiceOptions as option}
				<label class="frame-option">
					<input type="radio" name="frameId" value={option.id} required />
					<strong>{option.title}</strong>
					<span>{option.verb}</span>
				</label>
			{/each}
			<button type="submit">Confirm frame</button>
		</form>
	</section>
{:else}
	<p class="pilot-meta">{frameLabel} — {frameVerb} · {activeBloomName}</p>

	{#if suggestedNextAction}
		<section class="suggested-next" aria-label="Suggested next action">
			<span class="suggested-next__label">Suggested next</span>
			<p class="suggested-next__body">
				{#if suggestedNextAction.href}
					<a href={suggestedNextAction.href}><strong>{suggestedNextAction.label}</strong></a>
				{:else}
					<strong>{suggestedNextAction.label}</strong>
				{/if}
				— {suggestedNextAction.detail}
			</p>
		</section>
	{/if}

	<nav class="hub-tiles" aria-label="Pilot hub">
		{#each hubTiles as tile (tile.id)}
			<a
				href={tile.href}
				class="hub-tile hub-tile--{tile.id}"
				class:hub-tile--idle={tile.id === 'thumper' && tile.state === 'idle'}
				class:hub-tile--active={tile.id === 'thumper' && tile.state === 'active'}
				class:hub-tile--ready={tile.id === 'thumper' && tile.state === 'ready_to_claim'}
			>
				<span class="hub-tile__icon" aria-hidden="true">{HUB_TILE_ICONS[tile.id]}</span>

				<span class="hub-tile__body">
					<span class="hub-tile__title-row">
						<strong class="hub-tile__title">{HUB_TILE_TITLES[tile.id]}</strong>
						{#if tile.id === 'thumper'}
							{@const badge = thumperBadge(tile)}
							{#if badge}
								<span
									class="hub-tile__badge"
									class:hub-tile__badge--ready={tile.state === 'ready_to_claim'}
									class:hub-tile__badge--active={tile.state === 'active'}
								>
									{badge}
								</span>
							{/if}
						{/if}
					</span>
					<span class="hub-tile__why">{tile.why}</span>

					{#if tile.id === 'thumper'}
						<span class="hub-tile__status">
							<span class="hub-tile__headline">{thumperHeadline(tile)}</span>
							{#if tile.targetResource}
								<span class="hub-tile__target">{tile.targetResource}</span>
							{/if}
							<span class="hub-tile__detail">{thumperDetail(tile)}</span>
							{#if tile.overallConditionLine}
								<span class="hub-tile__condition">{tile.overallConditionLine}</span>
							{/if}
							<span class="hub-tile__parts">
								Drill: {formatPartCondition(tile.equippedParts.drill!)} · Pump:
								{formatPartCondition(tile.equippedParts.pump!)} · Hull:
								{formatPartCondition(tile.equippedParts.hull!)}
							</span>
						</span>
					{:else if tile.id === 'survey'}
						<span class="hub-tile__status">
							<EnergyBar
								energy={tile.surveyEnergy}
								cap={tile.surveyEnergyCap}
								outlook={tile.outlook}
								compact
							/>
							<span class="hub-tile__detail">{tile.detail}</span>
						</span>
					{:else if tile.id === 'workbench'}
						<span class="hub-tile__status">
							<ul class="hub-tile__schematics">
								{#each tile.schematicSummaries as summary}
									<li>
										<span class="hub-schematic-name">{summary.displayName}</span>
										{#if summary.craftableNow}
											<span class="hub-schematic-badge hub-schematic-badge--ready">Ready to craft</span>
										{:else if summary.firstBlocker}
											<span class="hub-schematic-blocker">{summary.firstBlocker}</span>
										{/if}
									</li>
								{/each}
							</ul>
						</span>
					{:else if tile.id === 'storage'}
						<span class="hub-tile__status">
							<span class="hub-tile__detail">{tile.detail}</span>
							<span class="hub-tile__counts">
								{#each FAMILY_ORDER as family}
									<span>{familyDisplayLabel(family)}: {tile.familyCounts[family]}</span>
								{/each}
								<span>Repair kits: {tile.repairKitCount}</span>
							</span>
						</span>
					{/if}
				</span>

				<span class="hub-tile__chevron" aria-hidden="true">›</span>
			</a>
		{/each}
	</nav>

	{#if import.meta.env.DEV}
		<details class="dev-panel">
			<summary>Dev</summary>
			{#if hasCompletedTutorial}
				{#if form?.message}
					<p class="flash flash--error">{form.message}</p>
				{/if}
				<form method="POST" action="?/rotateBloom" use:enhance>
					<button type="submit">Rotate bloom</button>
				</form>
				{#if bloomRotation}
					<p><small>Rotated to bloom #{bloomRotation.newBloomId}</small></p>
				{/if}
			{/if}
			<p>
				Resource stat codes from <code>shared</code>:
				{resourceStatCodes.join(', ')}
			</p>
			<p>
				Thumper state from server ({thumperSource}):
				{#if thumperDemo}
					{thumperDemo.status},
					{#if thumperDemo.status === 'active'}
						{displaySeconds}s remaining (client display)
					{:else}
						{thumperDemo.secondsRemaining}s remaining
					{/if}
					{#if openRun}
						— target: {openRun.targetDisplayName} ({openRun.targetResourceId})
					{/if}
				{:else}
					no thumper deployed
				{/if}
			</p>
		</details>
	{/if}
{/if}

<style>
	.pilot-meta {
		margin: 0 0 1rem;
		font-size: 0.9rem;
		color: var(--text-muted, #9ca3af);
	}

	.suggested-next {
		margin: 0 0 1rem;
		padding: 0.65rem 0.85rem;
		border: 1px solid var(--accent-info-border, #3b5998);
		border-radius: 0.5rem;
		background: var(--accent-info-bg, #1a2332);
	}

	.suggested-next__label {
		display: block;
		font-size: 0.7rem;
		font-weight: 600;
		letter-spacing: 0.06em;
		text-transform: uppercase;
		color: var(--accent-info, #60a5fa);
		margin-bottom: 0.25rem;
	}

	.suggested-next__body {
		margin: 0;
		font-size: 0.95rem;
	}

	.suggested-next__body a {
		color: var(--text-primary, #f3f4f6);
	}

	.hub-tiles {
		display: flex;
		flex-direction: column;
		gap: 0;
		margin: 0;
	}

	.hub-tile {
		display: flex;
		align-items: stretch;
		gap: 0.85rem;
		padding: 1rem 0.85rem;
		border-bottom: 1px solid var(--border-subtle, #2e2e2e);
		text-decoration: none;
		color: inherit;
		transition: background 0.15s ease;
		min-height: 4.5rem;
	}

	.hub-tile:first-child {
		border-top: 1px solid var(--border-subtle, #2e2e2e);
	}

	.hub-tile:hover {
		background: var(--surface-hover, #1f1f1f);
	}

	.hub-tile:focus-visible {
		outline: 2px solid var(--accent-info, #60a5fa);
		outline-offset: -2px;
	}

	.hub-tile--idle {
		border-left: 3px solid var(--border-muted, #444);
	}

	.hub-tile--active {
		border-left: 3px solid var(--accent-info, #60a5fa);
	}

	.hub-tile--ready {
		border-left: 3px solid var(--accent-success, #4ade80);
		background: var(--accent-success-bg, #0f1f14);
	}

	@media (prefers-reduced-motion: no-preference) {
		.hub-tile--active {
			animation: hub-tile-pulse 2.5s ease-in-out infinite;
		}
	}

	@keyframes hub-tile-pulse {
		0%,
		100% {
			background: transparent;
		}
		50% {
			background: var(--surface-active-pulse, #151d28);
		}
	}

	.hub-tile__icon {
		flex: 0 0 2rem;
		display: flex;
		align-items: flex-start;
		justify-content: center;
		font-size: 1.35rem;
		line-height: 1.2;
		padding-top: 0.1rem;
		opacity: 0.85;
	}

	.hub-tile__body {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.3rem;
	}

	.hub-tile__title-row {
		display: flex;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.hub-tile__title {
		font-size: 1.05rem;
		font-weight: 700;
	}

	.hub-tile__why {
		font-size: 0.85rem;
		color: var(--text-muted, #9ca3af);
		line-height: 1.35;
	}

	.hub-tile__status {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		margin-top: 0.15rem;
	}

	.hub-tile__headline {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.hub-tile--ready .hub-tile__headline {
		color: var(--accent-success, #4ade80);
		font-size: 1rem;
	}

	.hub-tile__target {
		font-size: 0.9rem;
		font-weight: 600;
	}

	.hub-tile__detail {
		font-size: 0.85rem;
		color: var(--text-secondary, #c4c4c4);
	}

	.hub-tile__condition,
	.hub-tile__parts {
		font-size: 0.78rem;
		color: var(--text-muted, #9ca3af);
		line-height: 1.35;
	}

	.hub-tile__counts {
		display: flex;
		flex-wrap: wrap;
		gap: 0.35rem 0.75rem;
		font-size: 0.82rem;
		color: var(--text-secondary, #c4c4c4);
	}

	.hub-tile__badge {
		font-size: 0.72rem;
		font-weight: 700;
		letter-spacing: 0.04em;
		padding: 0.1rem 0.4rem;
		border-radius: 0.25rem;
	}

	.hub-tile__badge--ready {
		color: #052e16;
		background: var(--accent-success, #4ade80);
		border: 1px solid var(--accent-success, #4ade80);
	}

	.hub-tile__badge--active {
		color: #1e3b4d;
		background: #93c5fd;
		border: 1px solid #60a5fa;
	}

	.hub-tile__schematics {
		list-style: none;
		margin: 0;
		padding: 0;
		display: grid;
		gap: 0.35rem;
	}

	.hub-tile__schematics li {
		display: flex;
		flex-direction: column;
		gap: 0.1rem;
	}

	.hub-schematic-name {
		font-size: 0.85rem;
		font-weight: 600;
	}

	.hub-schematic-badge {
		font-size: 0.78rem;
		font-weight: 600;
	}

	.hub-schematic-badge--ready {
		color: var(--accent-success, #4ade80);
	}

	.hub-schematic-blocker {
		font-size: 0.78rem;
		color: var(--text-muted, #9ca3af);
		line-height: 1.35;
	}

	.hub-tile__chevron {
		flex: 0 0 auto;
		align-self: center;
		font-size: 1.5rem;
		font-weight: 300;
		color: var(--text-muted, #6b7280);
		line-height: 1;
	}

	.frame-choice form {
		display: grid;
		gap: 0.75rem;
		max-width: 28rem;
	}

	.frame-option {
		display: grid;
		gap: 0.15rem;
		padding: 0.75rem;
		border: 1px solid var(--border-subtle, #333);
		border-radius: 0.35rem;
		background: var(--surface-raised, #1a1a1a);
		cursor: pointer;
	}

	.frame-option span {
		font-size: 0.85rem;
		color: var(--text-muted, #9ca3af);
	}
</style>
