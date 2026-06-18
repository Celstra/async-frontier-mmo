<script lang="ts">
	import type { WorkshopMissionStep } from './workshopMission';
	import { missionStepMeta } from './workshopMission';

	interface Props {
		activeStep: WorkshopMissionStep;
	}

	let { activeStep }: Props = $props();

	const nowLabel = $derived(missionStepMeta(activeStep).nowLabel);
</script>

<section
	class="workshop-mission"
	aria-labelledby="workshop-mission-title"
	data-testid="workshop-mission-panel"
>
	<div class="workshop-mission__badge" aria-hidden="true">Active mission</div>
	<h2 id="workshop-mission-title" class="workshop-mission__title">WORKSHOP TEST</h2>
	<p class="workshop-mission__lede">
		Field crews are grounded. Make the best thumper part you can from imperfect bench stock.
		Every slot choice and tuning point matters — compare prototypes, experiment when you are ready,
		and reclaim material from weak attempts.
	</p>
	<p class="workshop-mission__now" aria-live="polite">
		<span class="workshop-mission__now-label">Your next move:</span>
		{nowLabel}
	</p>
</section>

<style>
	.workshop-mission {
		margin: 0 0 1rem;
		padding: 1rem 1.1rem 1.05rem;
		border: 2px solid var(--phosphor);
		border-radius: var(--radius-md);
		background:
			linear-gradient(180deg, rgba(61, 255, 122, 0.12) 0%, rgba(10, 12, 10, 0.95) 42%),
			var(--bg-panel);
		box-shadow:
			0 0 0 1px rgba(61, 255, 122, 0.2),
			0 0 24px var(--phosphor-glow);
	}

	.workshop-mission__badge {
		display: inline-block;
		margin: 0 0 0.55rem;
		padding: 0.2rem 0.55rem;
		border: 1px solid var(--accent-warning);
		border-radius: var(--radius-sm);
		background: rgba(255, 176, 32, 0.12);
		color: var(--accent-warning);
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0.12em;
		text-transform: uppercase;
	}

	.workshop-mission__title {
		margin: 0 0 0.65rem;
		font-size: clamp(1.15rem, 2.4vw, 1.45rem);
		color: var(--text-bright);
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.workshop-mission__lede {
		margin: 0 0 0.85rem;
		max-width: 62ch;
		color: var(--text-primary);
		font-size: var(--font-size-sm);
		line-height: 1.55;
	}

	.workshop-mission__now {
		margin: 0;
		padding: 0.65rem 0.75rem;
		border: 1px solid var(--border-strong);
		border-radius: var(--radius-sm);
		background: var(--bg-inset);
		color: var(--text-bright);
		font-size: var(--font-size-sm);
		line-height: 1.45;
	}

	.workshop-mission__now-label {
		display: block;
		margin-bottom: 0.2rem;
		color: var(--phosphor);
		font-size: var(--font-size-xs);
		font-weight: 700;
		letter-spacing: 0.1em;
		text-transform: uppercase;
	}
</style>
