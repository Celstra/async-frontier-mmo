<script lang="ts">
	interface Props {
		screenTitle: string;
		screenId: 'field' | 'rig' | 'settlement';
	}

	let { screenTitle, screenId }: Props = $props();

	const copyByScreen = {
		field: 'Prospecting, sampling, and deploy will return after the workshop crafting slice is proven fun.',
		rig: 'Thumper chassis, deploy controls, and claim flow will return after the workshop crafting slice is proven fun.',
		settlement: 'Foreman orders, turn-ins, and fabricator milestones will return after the workshop crafting slice is proven fun.'
	} as const;
</script>

<section class="screen in-dev" aria-label="{screenTitle} console">
	<header class="screen__header in-dev__header">{screenTitle}</header>

	<div class="screen__body in-dev__body panel">
		<p class="in-dev__badge" role="status">In development</p>
		<p class="in-dev__lead">
			This screen is part of the full frontier loop but is not in the current playtest build.
		</p>
		<p class="in-dev__detail">{copyByScreen[screenId]}</p>
		<p class="in-dev__cta">
			Start crafting in <a href="/workshop">WORKSHOP</a> — bench stock is granted on first visit.
		</p>
	</div>
</section>

<style>
	.in-dev__header {
		margin: 0;
	}

	.in-dev__body {
		display: grid;
		gap: 0.85rem;
		padding: 1.25rem 1.35rem;
	}

	.in-dev__badge {
		margin: 0;
		width: fit-content;
		padding: 0.2rem 0.55rem;
		border: 1px solid var(--accent-warning-dim);
		border-radius: var(--radius-sm);
		color: var(--accent-warning);
		font-size: var(--font-size-xs);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.in-dev__lead,
	.in-dev__detail,
	.in-dev__cta {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		line-height: 1.5;
	}

	.in-dev__cta a {
		color: var(--phosphor);
	}
</style>
