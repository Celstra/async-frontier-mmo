<script lang="ts">
	import { enhance } from '$app/forms';
	import SegmentedBar from '$lib/field/SegmentedBar.svelte';
	import {
		commandQueueCommandHint,
		commandQueueCommandLabel,
		commandQueueTimingHint,
		forecastTimelineLabel,
		forecastTokenLabel
	} from '$lib/field/commandQueueLabels.js';
	import type { FieldCommandQueueView } from '$lib/server/fieldCommandQueueLoad.js';
	import type { CommandQueueBeatReadout, CommandQueueSlotLength, ThumperCommand } from '@async-frontier-mmo/domain';

	interface Props {
		view: FieldCommandQueueView;
		commands: readonly ThumperCommand[];
		errorMessage?: string | null;
		beatReadout?: CommandQueueBeatReadout | null;
	}

	let { view, commands, errorMessage = null, beatReadout = null }: Props = $props();

	const beatDisplay = $derived(view.currentBeat + 1);
	const heatPercent = $derived(
		view.meters.heatLimit > 0
			? (view.meters.heat / view.meters.heatLimit) * 100
			: 0
	);
	const heatNearLimit = $derived(view.meters.heat >= view.meters.heatLimit - 1);

	const editableSlot = $derived(view.timelineRows.find((row) => row.isBackSlot) ?? null);
	const canEditQueueSlot = $derived(
		!view.ended && !view.recalled && editableSlot !== null && !editableSlot.locked
	);
	const canAdvance = $derived(view.canAdvanceBeat && !view.ended && !view.recalled);
	const canRecall = $derived(!view.ended && !view.recalled);
	const queueLength = $derived(view.queueLength as CommandQueueSlotLength);
	const timingHint = $derived(commandQueueTimingHint(queueLength));
</script>

<section
	class="screen command-queue"
	class:command-queue--medium={queueLength === 3}
	data-testid="field-command-queue"
	data-queue-length={queueLength}
	aria-label="FIELD: Red Mesa command queue"
>
	<header class="screen__header command-queue__header">
		<h1 class="command-queue__title">FIELD: Red Mesa</h1>
		<p class="command-queue__beat" data-testid="field-command-queue-beat">
			Beat {beatDisplay} / {view.totalBeats}
		</p>
	</header>

	<div class="screen__body command-queue__body">
		{#if errorMessage}
			<p class="command-queue__error" role="alert">{errorMessage}</p>
		{/if}

		{#if view.recalled}
			<p class="command-queue__status" role="status">Recalled: secured yield kept, loose cargo forfeited.</p>
		{:else if view.ended && !view.canClaim}
			<p class="command-queue__status" role="status">Run ended: finish claim requirements before leaving.</p>
		{/if}

		<dl class="command-queue__meters" data-testid="field-command-queue-meters">
			<div class="command-queue__meter">
				<dt>Secured</dt>
				<dd>{view.meters.secured}</dd>
			</div>
			<div class="command-queue__meter">
				<dt>Loose</dt>
				<dd>{view.meters.loose}</dd>
			</div>
			<div class="command-queue__meter">
				<dt>Lost</dt>
				<dd>{view.meters.lost}</dd>
			</div>
			<div class="command-queue__meter">
				<dt>Hull</dt>
				<dd>{view.meters.hull}</dd>
			</div>
			<div class="command-queue__meter command-queue__meter--heat">
				<dt>Heat</dt>
				<dd>
					<span class="command-queue__heat-value">{view.meters.heat}/{view.meters.heatLimit}</span>
					<SegmentedBar
						progressPercent={heatPercent}
						segments={10}
						direction="fill"
						blinkActive={heatNearLimit}
					/>
				</dd>
			</div>
			<div class="command-queue__meter">
				<dt>Guard</dt>
				<dd>{view.meters.guard}</dd>
			</div>
		</dl>

		<div class="command-queue__timeline" data-testid="field-command-queue-timeline">
			<h2 class="command-queue__section-title">Timeline</h2>
			<p class="command-queue__timing" data-testid="field-command-queue-timing">
				{timingHint}
			</p>
			<ol class="command-queue__timeline-list">
				{#each view.timelineRows as row (row.beatIndex)}
					<li
						class="command-queue__timeline-row"
						class:command-queue__timeline-row--locked={row.locked}
						class:command-queue__timeline-row--editable={!row.locked && row === editableSlot && canEditQueueSlot}
						class:command-queue__timeline-row--hold={queueLength === 3 && row.offset > 0 && row.offset < view.timelineRows.length - 1}
						data-testid="field-command-queue-timeline-row"
					>
						<span class="command-queue__timeline-when">
							{forecastTimelineLabel(row.offset, queueLength)}
						</span>
						<span class="command-queue__timeline-command">
							{row.command ? commandQueueCommandLabel(row.command) : 'EMPTY'}
						</span>
						<span class="command-queue__timeline-field">
							{forecastTokenLabel(row.forecast)}
						</span>
						{#if row.locked}
							<span class="command-queue__timeline-badge">Locked</span>
						{:else if row.offset === 0 && canAdvance}
							<span class="command-queue__timeline-badge">On advance</span>
						{:else if row === editableSlot && canEditQueueSlot}
							<span class="command-queue__timeline-badge command-queue__timeline-badge--edit">Editable</span>
						{:else if queueLength === 3 && row.offset > 0 && row.offset < view.timelineRows.length - 1}
							<span class="command-queue__timeline-badge">Queued</span>
						{/if}
					</li>
				{/each}
			</ol>
			{#if beatReadout}
				<div class="command-queue__beat-readout" data-testid="field-command-queue-beat-readout" role="status">
					<p class="command-queue__beat-readout-line">{beatReadout.commandLine}</p>
					<p class="command-queue__beat-readout-line">{beatReadout.fieldLine}</p>
					<p class="command-queue__beat-readout-line">{beatReadout.heatLine}</p>
				</div>
			{/if}
		</div>

		{#if canEditQueueSlot}
			<div class="command-queue__commands" data-testid="field-command-queue-commands">
				<h2 class="command-queue__section-title">Queue command</h2>
				<div class="command-queue__command-grid">
					{#each commands as command (command)}
						<form method="POST" action="?/queueCommand" use:enhance class="command-queue__command-form">
							<input type="hidden" name="command" value={command} />
							<button type="submit" class="command-queue__command-button">
								<span class="command-queue__command-name">{commandQueueCommandLabel(command)}</span>
								<span class="command-queue__command-hint">{commandQueueCommandHint(command)}</span>
							</button>
						</form>
					{/each}
				</div>
			</div>
		{/if}

		<div class="command-queue__actions">
			{#if view.canClaim}
				<div class="command-queue__claim-ready" data-testid="field-command-queue-claim-ready" role="status">
					<p class="command-queue__claim-ready-line">
						Run complete. <strong>{view.meters.secured}u</strong> secured.
					</p>
					<p class="command-queue__claim-ready-hint">Claim sends secured yield to inventory.</p>
				</div>
				<form method="POST" action="?/claimRun" use:enhance class="command-queue__action-form">
					<button
						type="submit"
						class="command-queue__action-button command-queue__action-button--claim"
						data-testid="field-command-queue-claim-button"
					>
						Claim {view.meters.secured}u
					</button>
				</form>
			{/if}

			{#if canAdvance}
				<form method="POST" action="?/advanceBeat" use:enhance class="command-queue__action-form">
					<button type="submit" class="command-queue__action-button">Advance beat</button>
				</form>
			{/if}

			{#if canRecall}
				<form method="POST" action="?/recallRun" use:enhance class="command-queue__action-form">
					<button type="submit" class="command-queue__action-button command-queue__action-button--recall">
						Recall thumper
					</button>
				</form>
			{/if}
		</div>
	</div>
</section>

<style>
	.command-queue__header {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 1rem;
	}

	.command-queue__title {
		margin: 0;
		font-size: var(--font-size-base);
	}

	.command-queue__beat {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.command-queue__body {
		display: grid;
		gap: 1.1rem;
		padding: 1.1rem 1.25rem;
	}

	.command-queue__error {
		margin: 0;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--accent-danger-dim, #8b3a3a);
		color: var(--accent-danger, #ff7b7b);
		font-size: var(--font-size-sm);
	}

	.command-queue__status {
		margin: 0;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--accent-warning-dim);
		color: var(--accent-warning);
		font-size: var(--font-size-sm);
	}

	.command-queue__beat-readout {
		display: grid;
		gap: 0.25rem;
		margin-top: 0.65rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--phosphor-dim);
		background: var(--bg-inset);
	}

	.command-queue__beat-readout-line {
		margin: 0;
		color: var(--phosphor);
		font-size: var(--font-size-sm);
		letter-spacing: 0;
	}

	.command-queue__timing {
		margin: 0 0 0.45rem;
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		line-height: 1.45;
		letter-spacing: 0;
	}

	.command-queue__claim-ready {
		flex: 1 1 100%;
		display: grid;
		gap: 0.25rem;
		padding: 0.55rem 0.7rem;
		border: 1px solid var(--phosphor-dim);
		background: var(--bg-inset);
	}

	.command-queue__claim-ready-line,
	.command-queue__claim-ready-hint {
		margin: 0;
		font-size: var(--font-size-sm);
		letter-spacing: 0;
	}

	.command-queue__claim-ready-line {
		color: var(--phosphor);
	}

	.command-queue__claim-ready-hint {
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
	}

	.command-queue__section-title {
		margin: 0 0 0.45rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		letter-spacing: 0;
	}

	.command-queue__meters {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 0.65rem;
		margin: 0;
	}

	.command-queue__meter {
		margin: 0;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-default);
		background: var(--bg-inset);
	}

	.command-queue__meter dt {
		margin: 0;
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.command-queue__meter dd {
		margin: 0.2rem 0 0;
		color: var(--phosphor);
		font-size: var(--font-size-lg);
		font-variant-numeric: tabular-nums;
	}

	.command-queue__meter--heat {
		grid-column: span 3;
	}

	.command-queue__heat-value {
		display: block;
		margin-bottom: 0.35rem;
		font-size: var(--font-size-sm);
		color: var(--text-secondary);
	}

	.command-queue__timeline-list {
		display: grid;
		gap: 0.45rem;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.command-queue__timeline-row {
		display: grid;
		grid-template-columns: 4.5rem minmax(0, 1fr) minmax(0, 1fr) minmax(6.25rem, auto);
		align-items: center;
		gap: 0.65rem;
		padding: 0.55rem 0.65rem;
		border: 1px solid var(--border-default);
		background: var(--bg-inset);
	}

	.command-queue__timeline-when {
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.command-queue__timeline-command,
	.command-queue__timeline-field {
		color: var(--phosphor);
		font-size: var(--font-size-sm);
		letter-spacing: 0;
	}

	.command-queue__timeline-row--locked {
		opacity: 0.72;
	}

	.command-queue__timeline-row--editable {
		border-color: var(--phosphor-dim);
	}

	.command-queue__timeline-row--hold {
		opacity: 0.88;
	}

	.command-queue__timeline-badge {
		padding: 0.15rem 0.4rem;
		border: 1px solid var(--border-default);
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		letter-spacing: 0;
		text-transform: uppercase;
	}

	.command-queue__timeline-badge--edit {
		border-color: var(--phosphor-dim);
		color: var(--phosphor);
	}

	.command-queue__command-grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 0.55rem;
	}

	.command-queue__command-form {
		margin: 0;
	}

	.command-queue__command-button {
		display: grid;
		gap: 0.2rem;
		width: 100%;
		padding: 0.55rem 0.65rem;
		text-align: left;
	}

	.command-queue__command-name {
		color: var(--phosphor);
		font-size: var(--font-size-sm);
		letter-spacing: 0;
	}

	.command-queue__command-hint {
		color: var(--text-secondary);
		font-size: var(--font-size-xs);
		text-transform: none;
		letter-spacing: 0;
	}

	.command-queue__actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.55rem;
	}

	.command-queue__action-form {
		margin: 0;
	}

	.command-queue__action-button {
		min-width: 8rem;
	}

	.command-queue__action-button--claim {
		border-color: var(--phosphor);
		color: var(--phosphor);
	}

	.command-queue__action-button--recall {
		color: var(--accent-warning);
		border-color: var(--accent-warning-dim);
	}

	@media (max-width: 520px) {
		.command-queue__header {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.35rem;
		}

		.command-queue__meters {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.command-queue__meter--heat {
			grid-column: span 2;
		}

		.command-queue__command-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.command-queue__timeline-row {
			grid-template-columns: 3.5rem minmax(0, 1fr) minmax(0, 1fr);
		}

		.command-queue__timeline-badge {
			grid-column: 1 / -1;
			justify-self: start;
		}

		.command-queue__actions {
			flex-direction: column;
		}

		.command-queue__action-button {
			width: 100%;
		}
	}
</style>
