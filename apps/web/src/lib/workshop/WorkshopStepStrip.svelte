<script lang="ts">
	import {
		WORKSHOP_MISSION_STEPS,
		scrollToWorkshopStep,
		type WorkshopMissionStep
	} from './workshopMission';

	interface Props {
		activeStep: WorkshopMissionStep;
	}

	let { activeStep }: Props = $props();

	const activeIndex = $derived(
		WORKSHOP_MISSION_STEPS.findIndex((step) => step.id === activeStep)
	);

	function handleStepClick(step: WorkshopMissionStep): void {
		scrollToWorkshopStep(step);
	}
</script>

<nav class="workshop-steps" aria-label="Workshop progress" data-testid="workshop-step-strip">
	<ol class="workshop-steps__list">
		{#each WORKSHOP_MISSION_STEPS as step, index (step.id)}
			<li class="workshop-steps__row">
				<button
					type="button"
					class="workshop-steps__item"
					class:workshop-steps__item--active={step.id === activeStep}
					class:workshop-steps__item--complete={index < activeIndex}
					aria-current={step.id === activeStep ? 'step' : undefined}
					title="Jump to {step.shortLabel}"
					onclick={() => handleStepClick(step.id)}
				>
					<span class="workshop-steps__number" aria-hidden="true">{step.number}</span>
					<span class="workshop-steps__label">{step.shortLabel}</span>
					{#if step.id === activeStep}
						<span class="workshop-steps__here">You are here</span>
					{/if}
				</button>
			</li>
		{/each}
	</ol>
</nav>

<style>
	.workshop-steps {
		margin: 0 0 1.15rem;
		padding: 0.75rem 0.85rem;
		border: 1px solid var(--border-default);
		border-radius: var(--radius-md);
		background: var(--bg-inset);
	}

	.workshop-steps__list {
		display: grid;
		gap: 0.55rem;
		list-style: none;
		margin: 0;
		padding: 0;
	}

	.workshop-steps__row {
		margin: 0;
		padding: 0;
	}

	.workshop-steps__item {
		display: grid;
		gap: 0.15rem;
		width: 100%;
		padding: 0.55rem 0.6rem;
		border: 1px solid var(--border-subtle);
		border-radius: var(--radius-sm);
		background: var(--bg-panel);
		color: var(--text-muted);
		font: inherit;
		font-size: var(--font-size-xs);
		line-height: 1.35;
		text-align: left;
		cursor: pointer;
		transition:
			border-color 120ms ease,
			background 120ms ease,
			box-shadow 120ms ease;
	}

	.workshop-steps__item:hover {
		border-color: var(--phosphor-dim);
		background: var(--bg-hover);
		color: var(--text-secondary);
	}

	.workshop-steps__item:focus-visible {
		outline: 2px solid var(--phosphor);
		outline-offset: 2px;
	}

	.workshop-steps__item--complete {
		border-color: var(--phosphor-dim);
		color: var(--text-secondary);
	}

	.workshop-steps__item--active {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
		color: var(--text-bright);
		box-shadow: 0 0 12px rgba(61, 255, 122, 0.18);
	}

	.workshop-steps__item--active:hover {
		border-color: var(--phosphor);
		background: var(--phosphor-glow);
		color: var(--text-bright);
	}

	.workshop-steps__number {
		font-size: 0.7rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.workshop-steps__label {
		font-size: var(--font-size-sm);
		font-weight: 600;
	}

	.workshop-steps__here {
		color: var(--phosphor);
		font-size: 0.68rem;
		font-weight: 700;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}
</style>
