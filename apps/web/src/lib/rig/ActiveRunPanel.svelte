<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import SegmentedBar from '$lib/field/SegmentedBar.svelte';
	import ThumperAsciiPre from '$lib/rig/ThumperAsciiPre.svelte';
	import { buildThumperAscii } from '$lib/rig/thumperAscii';
	import { formatMmSs } from '@async-frontier-mmo/domain';
	import type { ActiveRunClaimView, ActiveRunPanelRun } from './activeRunPanelTypes';

	interface Props {
		run: ActiveRunPanelRun;
		claimView?: ActiveRunClaimView;
		variant?: 'field' | 'rig';
		showAscii?: boolean;
		claimAction?: string;
		acknowledgeClaimAction?: string;
		respondEventWindowAction?: string;
		claimButtonLabel?: string;
		acknowledgeButtonLabel?: string;
	}

	let {
		run,
		claimView = null,
		variant = 'rig',
		showAscii = false,
		claimAction = '?/claim',
		acknowledgeClaimAction = '?/acknowledgeClaim',
		respondEventWindowAction = '?/respondEventWindow',
		claimButtonLabel = 'Claim yield',
		acknowledgeButtonLabel = 'Send to storage'
	}: Props = $props();

	let localSecondsRemaining = $state(0);
	let localFailsafeSecondsRemaining = $state(0);
	let localDrainPercent = $state(0);
	let failsafeTripped = $state(false);

	const frozenResult = $derived(claimView?.mode === 'result');

	const unresolvedEventWindows = $derived(
		run.eventWindows.filter((window) => !window.quiet && !window.responded)
	);
	const resolvedEventWindows = $derived(
		run.eventWindows.filter((window) => !window.quiet && window.responded)
	);

	const deployedThumperAscii = $derived.by(() => {
		if (!showAscii) return '';

		const target = run.openRun.targetDisplayName.slice(0, 18);
		return buildThumperAscii({
			mode: 'deployed',
			showProspectorScale: false,
			header: target,
			hull: { equipped: true, label: 'HULL' },
			drill: { equipped: true, label: 'DRILL' },
			pump: { equipped: true, label: 'PUMP' },
			footer: `HULL ${run.runHullCondition}%`
		});
	});

	$effect(() => {
		const id = setInterval(() => {
			void invalidateAll();
		}, 3000);
		return () => clearInterval(id);
	});

	$effect(() => {
		if (!run.thumperDemo || run.runDurationSeconds <= 0) {
			localSecondsRemaining = 0;
			localFailsafeSecondsRemaining = 0;
			localDrainPercent = 0;
			failsafeTripped = false;
			return;
		}

		const loadedAtMs = new Date(run.loadedAt).getTime();
		const initialRemaining = run.thumperDemo.secondsRemaining;
		const totalSeconds = run.runDurationSeconds;
		const failsafeTotal = run.effectiveDurationSeconds ?? totalSeconds;
		const initialFailsafeRemaining = Math.max(
			0,
			Math.ceil(failsafeTotal - (totalSeconds - initialRemaining))
		);

		if (frozenResult) {
			localSecondsRemaining = 0;
			localFailsafeSecondsRemaining = 0;
			failsafeTripped = run.failsafeActive === true;
			localDrainPercent = 100;
			return;
		}

		const tick = () => {
			const elapsedSeconds = (Date.now() - loadedAtMs) / 1000;
			localSecondsRemaining = Math.max(0, Math.ceil(initialRemaining - elapsedSeconds));
			const elapsedTotal = totalSeconds - localSecondsRemaining;
			localDrainPercent = Math.min(100, (elapsedTotal / totalSeconds) * 100);

			if (run.failsafeActive) {
				localFailsafeSecondsRemaining = Math.max(
					0,
					Math.ceil(initialFailsafeRemaining - elapsedSeconds)
				);
				failsafeTripped = localFailsafeSecondsRemaining <= 0;
			} else {
				localFailsafeSecondsRemaining = 0;
				failsafeTripped = false;
			}
		};

		tick();
		const id = setInterval(tick, 1000);
		return () => clearInterval(id);
	});
</script>

<section
	class="active-run panel"
	class:active-run--field={variant === 'field'}
	aria-label="Active deployment"
>
	{#if claimView?.mode === 'result'}
		<div class="claim-result panel-inset claim-panel claim-panel--top">
			{#if claimView.tutorialRecallBannerLine}
				<p class="claim-result__banner claim-result__banner--verbatim">
					{claimView.tutorialRecallBannerLine}
				</p>
			{:else}
				<p class="claim-result__banner">RIG SECURED</p>
				<p>{claimView.explanation.summary}</p>
				<p>{claimView.claimResult.recoveredQuantity}u recovered</p>
			{/if}
			{#if claimView.tutorialComparisonLine}
				<p class="claim-result__comparison">{claimView.tutorialComparisonLine}</p>
			{/if}
			<form method="POST" action={acknowledgeClaimAction} use:enhance class="claim-ack">
				<input type="hidden" name="thumperRunId" value={claimView.runId} />
				<button type="submit" class="action-row action-row--primary">
					{acknowledgeButtonLabel}
				</button>
			</form>
		</div>
	{:else if claimView?.mode === 'claimable' && variant === 'field'}
		<div class="claim-panel claim-panel--top">
			<form method="POST" action={claimAction} use:enhance>
				<button type="submit" class="action-row action-row--primary">{claimButtonLabel}</button>
			</form>
		</div>
	{/if}

	{#if variant === 'rig'}
		<div class="active-run__header">
			<div>
				<h2 class="panel__title">Active deployment</h2>
				<p class="active-run__target">{run.openRun.targetDisplayName}</p>
			</div>
			{#if claimView?.mode === 'claimable'}
				<form method="POST" action={claimAction} use:enhance>
					<button type="submit" class="action-row action-row--primary">{claimButtonLabel}</button>
				</form>
			{/if}
		</div>
	{/if}

	{#if showAscii && deployedThumperAscii}
		<ThumperAsciiPre art={deployedThumperAscii} />
	{/if}

	<div class="rig-timer">
		<SegmentedBar
			progressPercent={localDrainPercent}
			direction="drain"
			blinkActive={localSecondsRemaining > 0 && !failsafeTripped}
		/>
		{#if failsafeTripped}
			<p class="rig-timer__failsafe rig-timer__failsafe--tripped">
				FAIL-SAFE TRIPPED — rig secured at {formatMmSs(run.effectiveDurationSeconds ?? 0)}. Hull
				integrity spent.
			</p>
		{:else}
			<p class="rig-timer__clock">
				{localSecondsRemaining > 0 ? formatMmSs(localSecondsRemaining) : '0:00'} remaining
			</p>
			{#if run.failsafeActive}
				<p class="rig-timer__failsafe">
					fail-safe in {formatMmSs(localFailsafeSecondsRemaining)}
				</p>
			{/if}
		{/if}
	</div>

	{#if run.runMeters}
		<div class="rig-dashboard panel-inset">
			{#if variant === 'field'}
				<p class="rig-dashboard__title">Live rig</p>
			{/if}
			<div class="rig-dashboard__row">
				<span class="rig-dashboard__label">Signal lock</span>
				<SegmentedBar progressPercent={run.runMeters.signalLock} />
				<span class="rig-dashboard__value">{run.runMeters.signalLock}%</span>
			</div>
			<div class="rig-dashboard__row">
				<span class="rig-dashboard__label">Pump flow</span>
				<SegmentedBar progressPercent={run.runMeters.pumpFlow} />
				<span class="rig-dashboard__value">{run.runMeters.pumpFlow}%</span>
			</div>
			<div class="rig-dashboard__row">
				<span class="rig-dashboard__label">Hull condition</span>
				<SegmentedBar progressPercent={run.runHullCondition} />
				<span class="rig-dashboard__value">{run.runHullCondition}%</span>
			</div>
			<div class="rig-dashboard__row rig-dashboard__row--integrity">
				<span class="rig-dashboard__label">Hull integrity</span>
				<SegmentedBar progressPercent={run.runHullIntegrity ?? 100} />
				<span class="rig-dashboard__value">
					{run.runHullIntegrity ?? 100}%
					{#if run.failsafeActive}
						<span class="rig-dashboard__failsafe">(fail-safe)</span>
					{/if}
				</span>
			</div>
			{#if run.drillCondition !== null}
				<div class="rig-dashboard__row">
					<span class="rig-dashboard__label">Drill condition</span>
					<SegmentedBar progressPercent={run.drillCondition} />
					<span class="rig-dashboard__value">{run.drillCondition}%</span>
				</div>
			{/if}
			{#if run.pumpCondition !== null}
				<div class="rig-dashboard__row">
					<span class="rig-dashboard__label">Pump condition</span>
					<SegmentedBar progressPercent={run.pumpCondition} />
					<span class="rig-dashboard__value">{run.pumpCondition}%</span>
				</div>
			{/if}
			<div class="rig-dashboard__row">
				<span class="rig-dashboard__label">Threat</span>
				<SegmentedBar progressPercent={run.runMeters.threatPressure} />
				<span class="rig-dashboard__value">{run.runMeters.threatPressure}%</span>
			</div>
			<p class="rig-dashboard__recovery">Recovery ~{run.runMeters.projectedRecovery}u</p>
		</div>
	{/if}

	{#if unresolvedEventWindows.length > 0}
		<div class="event-stack">
			{#each unresolvedEventWindows as window (window.windowIndex)}
				<div class="event-window panel-inset">
					<p class="event-window__title">
						{window.complication?.replaceAll('_', ' ')}
						{#if window.severity}
							<span class="event-window__severity">{window.severity}</span>
						{/if}
					</p>
					{#if window.matchingActionLabel}
						<p class="event-window__match">Best match: {window.matchingActionLabel}</p>
					{/if}
					<div class="action-rows">
						{#each window.responseOptions as option (option.id)}
							<form method="POST" action={respondEventWindowAction} use:enhance>
								<input type="hidden" name="windowIndex" value={window.windowIndex} />
								<input type="hidden" name="chosenResponse" value={option.id} />
								<button type="submit" disabled={!option.enabled} class="action-row event-option">
									<span class="event-option__label">{option.label}</span>
									{#if option.effectLine}
										<span class="event-option__effect">{option.effectLine}</span>
									{/if}
									{#if !option.enabled && option.disabledReason}
										<span class="event-option__disabled">{option.disabledReason}</span>
									{/if}
								</button>
							</form>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{:else if !run.runReadyToResolve && claimView?.mode !== 'result'}
		<p class="active-run__idle panel-inset">No current event window — rig is running.</p>
	{/if}

	{#if resolvedEventWindows.length > 0}
		<div class="event-log panel-inset">
			<p class="event-log__title">Run log</p>
			{#each resolvedEventWindows as window (window.windowIndex)}
				<div class="event-log__entry">
					<p class="event-log__headline">
						{window.complication?.replaceAll('_', ' ')}
						{#if window.chosenResponse}
							· {window.responseOptions.find((option) => option.id === window.chosenResponse)
								?.label ?? window.chosenResponse}
						{/if}
					</p>
					{#if window.outcomeLine}
						<p class="event-log__outcome">{window.outcomeLine}</p>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</section>

<style>
	.active-run {
		border-color: var(--phosphor-dim);
	}

	.active-run--field {
		margin-bottom: 1rem;
	}

	.active-run__header {
		display: flex;
		flex-wrap: wrap;
		justify-content: space-between;
		gap: 0.75rem;
		align-items: start;
		margin-bottom: 0.85rem;
	}

	.active-run__target {
		margin: 0.25rem 0 0;
		font-size: var(--font-size-sm);
		color: var(--phosphor);
	}

	.active-run__idle {
		margin: 0;
		padding: 0.75rem;
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.rig-timer {
		margin: 0.75rem 0 1rem;
	}

	.rig-timer__clock,
	.rig-timer__failsafe {
		margin: 0.35rem 0 0;
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		text-align: center;
	}

	.rig-timer__clock {
		color: var(--phosphor);
	}

	.rig-timer__failsafe {
		color: var(--accent-warning);
	}

	.rig-timer__failsafe--tripped {
		color: var(--accent-danger, var(--accent-warning));
	}

	.rig-dashboard {
		margin-bottom: 1rem;
		padding: 0.75rem;
	}

	.rig-dashboard__title {
		margin: 0 0 0.65rem;
		font-size: var(--font-size-xs);
		text-transform: uppercase;
		letter-spacing: 0.06em;
		color: var(--text-muted);
	}

	.rig-dashboard__row {
		display: grid;
		grid-template-columns: 7rem 1fr auto;
		gap: 0.5rem;
		align-items: center;
		margin-bottom: 0.45rem;
	}

	.rig-dashboard__label,
	.rig-dashboard__value,
	.rig-dashboard__recovery {
		font-size: var(--font-size-xs);
	}

	.rig-dashboard__label {
		color: var(--text-secondary);
	}

	.rig-dashboard__value {
		min-width: 3.5rem;
		text-align: right;
		font-family: var(--font-mono);
		color: var(--phosphor-dim);
	}

	.rig-dashboard__row--integrity .rig-dashboard__label,
	.rig-dashboard__failsafe {
		color: var(--accent-warning);
	}

	.rig-dashboard__recovery {
		margin: 0.5rem 0 0;
		color: var(--text-muted);
	}

	.event-stack {
		display: grid;
		gap: 0.75rem;
	}

	.event-window {
		padding: 0.75rem;
	}

	.event-window__title,
	.event-window__match,
	.event-log__title,
	.event-log__headline,
	.event-log__outcome {
		margin: 0;
	}

	.event-window__title {
		margin-bottom: 0.35rem;
		font-size: var(--font-size-sm);
		color: var(--text-bright);
		text-transform: capitalize;
	}

	.event-window__severity {
		margin-left: 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--accent-warning);
		text-transform: uppercase;
	}

	.event-window__match {
		margin-bottom: 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
	}

	.event-option {
		display: grid;
		gap: 0.25rem;
		width: 100%;
		text-align: left;
	}

	.event-option__label {
		font-weight: 600;
	}

	.event-option__effect,
	.event-option__disabled {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
	}

	.event-option__disabled {
		color: var(--accent-warning);
	}

	.event-log {
		margin-top: 0.75rem;
		padding: 0.75rem;
	}

	.event-log__title {
		margin-bottom: 0.5rem;
		font-size: var(--font-size-xs);
		color: var(--text-muted);
		text-transform: uppercase;
	}

	.event-log__entry + .event-log__entry {
		margin-top: 0.5rem;
		padding-top: 0.5rem;
		border-top: 1px solid var(--border-subtle);
	}

	.event-log__headline {
		font-size: var(--font-size-xs);
		color: var(--text-secondary);
		text-transform: capitalize;
	}

	.event-log__outcome {
		margin-top: 0.25rem;
		font-size: var(--font-size-xs);
		color: var(--phosphor);
	}

	.claim-panel {
		margin-bottom: 1rem;
	}

	.claim-panel--top {
		margin-bottom: 1.25rem;
	}

	.claim-result__banner {
		margin: 0 0 0.5rem;
		font-weight: 700;
		color: var(--accent-warning);
		letter-spacing: 0.06em;
	}

	.claim-result__banner--verbatim {
		font-weight: 500;
		font-family: var(--font-mono);
		font-size: var(--font-size-sm);
		line-height: 1.45;
		letter-spacing: normal;
		color: var(--text-bright);
	}

	.claim-result__comparison {
		margin: 0.75rem 0 0;
		padding-top: 0.65rem;
		border-top: 1px solid var(--border-subtle);
		font-family: var(--font-mono);
		font-size: var(--font-size-xs);
		color: var(--phosphor);
	}

	.claim-ack {
		margin-top: 0.75rem;
	}
</style>
