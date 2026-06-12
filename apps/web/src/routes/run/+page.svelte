<script lang="ts">
import { enhance } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { complicationDisplayName } from '@async-frontier-mmo/domain';
import { formatDuration } from '$lib/formatDuration';
import type { PageProps } from './$types';

let { data, form }: PageProps = $props();

const thumperDemo = $derived(form?.thumperDemo ?? data.thumperDemo);
const openRun = $derived(form?.openRun ?? data.openRun);
const eventWindows = $derived(form?.eventWindows ?? data.eventWindows);
const runMeters = $derived(form?.runMeters ?? data.runMeters);
const runReadyToResolve = $derived(form?.runReadyToResolve ?? data.runReadyToResolve);
const fieldRepairKitCount = $derived(form?.fieldRepairKitCount ?? data.fieldRepairKitCount);

let displaySeconds = $state<number | null>(null);
let respondingWindowIndex = $state<number | null>(null);

// Get the most recent window outcome for delta display
const latestRespondedWindow = $derived(
	eventWindows
		.filter((w) => w.responded && w.outcomeLine)
		.sort((a, b) => b.windowIndex - a.windowIndex)[0]
);

function isActiveWindow(windowIndex: number): boolean {
	if (openRun.recalled) return false;
	const prior = eventWindows.filter((window) => window.windowIndex < windowIndex);
	if (!prior.every((window) => window.quiet || window.responded)) return false;
	const current = eventWindows.find((window) => window.windowIndex === windowIndex);
	return current ? !current.quiet && !current.responded : false;
}

function severityTitle(severity: string, complication: string): string {
	const name = complicationDisplayName(complication as import('@async-frontier-mmo/domain').ThumperComplicationId);
	return severity === 'serious' ? `${name} — SERIOUS` : `${name} — Minor`;
}

function severityClass(severity: string): string {
	return severity === 'serious' ? 'window-card--serious' : 'window-card--minor';
}

function optionHeaderLabel(optionId: string, matchingActionLabel: string): string {
	if (optionId === 'recall_early') return 'Recall Early';
	if (optionId === 'hold') return 'Hold Position';
	if (optionId === 'field_repair') return 'Field Repair';
	return matchingActionLabel;
}

function optionSubheader(optionId: string, matchingActionLabel: string): string | null {
	if (optionId === 'recall_early') return 'End the run, keep secured yield';
	if (optionId === 'hold') return 'Do nothing, accept the loss';
	if (optionId === 'field_repair') return 'Use a repair kit to protect yield';
	if (optionId === matchingActionLabel.toLowerCase().replace(/\s+/g, '_')) {
		return 'Recommended response — protects yield';
	}
	return 'Alternate response — may cost yield';
}

$effect(() => {
	if (!thumperDemo || thumperDemo.status !== 'active') {
		displaySeconds = thumperDemo?.secondsRemaining ?? null;
		return;
	}

	displaySeconds = thumperDemo.secondsRemaining;

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
</script>

<p><a href="/">← Pilot Home</a></p>

<!-- Status Header -->
<header class="run-status">
	{#if openRun.recalled}
		<div class="status-banner status-banner--recalled">
			<span class="status-indicator">↩</span>
			<div class="status-content">
				<strong>Run Recalled Early</strong>
				<span class="status-detail">Thumper secured. Return to Pilot Home to claim your yield.</span>
			</div>
		</div>
	{:else if thumperDemo.status === 'claimable'}
		<div class="status-banner status-banner--finished">
			<span class="status-indicator">✓</span>
			<div class="status-content">
				<strong>Run Complete — Ready to Claim</strong>
				<span class="status-detail">All event windows resolved. Your thumper is ready for extraction.</span>
			</div>
			{#if runReadyToResolve}
				<a href="/claim" class="claim-link">Go to Claim →</a>
			{/if}
		</div>
	{:else if thumperDemo.status === 'active'}
		<div class="status-banner status-banner--active">
			<span class="status-indicator timer-pulse"></span>
			<div class="status-content">
				<strong>Run In Progress</strong>
				<span class="status-detail">Thumper active on {openRun.targetDisplayName}</span>
			</div>
<div class="timer-display">
			<span class="timer-value">{formatDuration(displaySeconds ?? thumperDemo.secondsRemaining)}</span>
			<span class="timer-label">remaining</span>
		</div>
		</div>
	{/if}
</header>

<!-- Frame Context -->
<p class="frame-context">
	Frame: <strong>{data.frameLabel}</strong> — {data.frameVerb}
	{#if openRun.isPushRun}
		<span class="push-tag">Push Run ({eventWindows.length} windows)</span>
	{/if}
</p>

<!-- Thumper Condition Summary -->
{#if data.overallThumperCondition}
	<div class="thumper-condition-bar">
		<span class="condition-label">Thumper condition</span>
		<span class="condition-value" class:condition-value--solid={data.overallThumperCondition.band === 'Solid'} class:condition-value--worn={data.overallThumperCondition.band === 'Worn'} class:condition-value--failing={data.overallThumperCondition.band === 'Failing'}>
			{data.overallThumperCondition.band} ({data.overallThumperCondition.percent}%)
		</span>
		<span class="condition-weakest">— {data.overallThumperCondition.displayLine.split('—')[1]?.trim() ?? ''}</span>
	</div>
{/if}

{#if data.gearYieldPenalty?.isPenalized}
	<aside class="gear-penalty-callout" role="status">
		<p class="gear-penalty-title">Worn gear is cutting your yield</p>
		<p class="gear-penalty-body">
			This run projects <strong>{data.gearYieldPenalty.projectedRecovery}</strong> units instead of
			<strong>{data.gearYieldPenalty.recoveryAtFullPerformance}</strong> with repaired parts — about
			<strong>{data.gearYieldPenalty.unitsLostToWear} fewer units</strong>
			({data.gearYieldPenalty.performancePercent}% gear efficiency).
		</p>
		<p class="gear-penalty-foot">
			Condition on drill, pump, and hull all feed into extraction.
			<a href="/craft">Repair at Workbench</a> before your next deploy when you can.
		</p>
	</aside>
{/if}

<!-- Run Meters -->
{#if runMeters}
	<section class="run-meters">
		<div class="meter meter--primary">
			<span class="meter-label">Projected Recovery</span>
			<span class="meter-value meter-value--primary">
				{runMeters.projectedRecovery}
				<span class="meter-unit">units</span>
			</span>
			{#if latestRespondedWindow}
				{@const outcomeMatch = latestRespondedWindow.outcomeLine?.match(/(\d+)\s*→\s*(\d+)/)}
				{#if outcomeMatch}
					{@const before = parseInt(outcomeMatch[1], 10)}
					{@const after = parseInt(outcomeMatch[2], 10)}
					{@const delta = after - before}
					<span class="meter-delta" class:meter-delta--negative={delta < 0} class:meter-delta--positive={delta > 0}>
						{delta > 0 ? '+' : ''}{delta}
					</span>
				{/if}
			{/if}
		</div>

		<div class="meters-secondary">
			<div class="meter">
				<span class="meter-label">Signal Lock</span>
				<span class="meter-value">{runMeters.signalLock}%</span>
			</div>
			<div class="meter">
				<span class="meter-label">Pump Flow</span>
				<span class="meter-value">{runMeters.pumpFlow}%</span>
			</div>
			<div class="meter">
				<span class="meter-label">Threat Pressure</span>
				<span class="meter-value">{runMeters.threatPressure}%</span>
			</div>
			<div class="meter">
				<span class="meter-label">Run hull</span>
				<span class="meter-value">{runMeters.hullCondition}%</span>
			</div>
		</div>
	</section>
{/if}

<!-- Event Windows -->
<section class="event-windows">
	<header class="section-header">
		<h2>Event Windows</h2>
		<p class="section-help">
			Complications arise during extraction. Choose how to respond — each choice has a cost.
			Field Repair Kits in inventory: <strong>{fieldRepairKitCount}</strong>
		</p>
	</header>

	{#if form?.message}
		<p class="flash flash--error"><strong>{form.message}</strong></p>
	{/if}

	<div class="windows-list">
		{#each eventWindows as window}
			<article
				class="window-card {window.quiet ? 'window-card--quiet' : severityClass(window.severity ?? 'minor')}"
				class:window-card--pending={!window.quiet && !window.responded && isActiveWindow(window.windowIndex)}
				class:window-card--resolved={window.responded && !window.quiet}
			>
				<!-- Window Header -->
				<header class="window-header">
					<h3 class="window-title">
						<span class="window-number">#{window.windowIndex}</span>
						{#if window.quiet}
							<span class="complication-name complication-name--quiet">All Quiet</span>
						{:else}
							<span class="complication-name" class:complication-name--serious={window.severity === 'serious'}>
								{severityTitle(window.severity ?? 'minor', window.complication ?? 'signal_drift')}
							</span>
						{/if}
					</h3>
					{#if window.quiet}
						<span class="severity-badge severity-badge--quiet">Quiet</span>
					{:else if window.severity === 'serious'}
						<span class="severity-badge severity-badge--serious">SERIOUS</span>
					{:else}
						<span class="severity-badge severity-badge--minor">Minor</span>
					{/if}
				</header>

				{#if window.quiet}
					<p class="window-quiet-message">{window.quietMessage}</p>

				{:else if window.responded}
					<!-- Resolved State -->
					<div class="resolution-summary">
						<div class="response-taken">
							<span class="response-label">Response:</span>
							<strong class="response-choice">{optionHeaderLabel(window.chosenResponse ?? '', window.matchingActionLabel ?? '')}</strong>
						</div>
						{#if window.outcomeLine}
							<div class="outcome-details flash flash--success">
								{window.outcomeLine}
							</div>
						{/if}
					</div>
				{:else if isActiveWindow(window.windowIndex) && !openRun.recalled}
					<!-- Decision Cards -->
					<form
						method="POST"
						action="?/respond"
						class="decision-form"
						use:enhance={() => {
							respondingWindowIndex = window.windowIndex;
							return async ({ update }) => {
								await update({ reset: false });
								respondingWindowIndex = null;
							};
						}}
					>
						<input type="hidden" name="windowIndex" value={window.windowIndex} />

						<div class="decision-cards">
							{#each window.responseOptions as option}
								{@const isMatchingAction = option.id === window.matchingAction}
								{@const isRecall = option.id === 'recall_early'}
								{@const isHold = option.id === 'hold'}
								{@const isFieldRepair = option.id === 'field_repair'}

								<button
									type="submit"
									name="chosenResponse"
									value={option.id}
									disabled={!option.enabled || respondingWindowIndex !== null}
									class="decision-card"
									class:decision-card--matching={isMatchingAction}
									class:decision-card--recall={isRecall}
									class:decision-card--hold={isHold}
									class:decision-card--field-repair={isFieldRepair}
									class:decision-card--disabled={!option.enabled}
								>
									<div class="decision-card__header">
										<span class="decision-card__title">{optionHeaderLabel(option.id, window.matchingActionLabel ?? '')}</span>
										{#if isMatchingAction && option.id !== 'field_repair'}
											<span class="decision-card__badge">Recommended</span>
										{/if}
									</div>

									{#if optionSubheader(option.id, window.matchingActionLabel ?? '')}
										<span class="decision-card__subheader">{optionSubheader(option.id, window.matchingActionLabel ?? '')}</span>
									{/if}

									{#if option.effectLine}
										<div class="decision-card__stakes">
											<span class="stakes-label">Outcome:</span>
											<span class="stakes-value">{option.effectLine}</span>
										</div>
									{/if}

									{#if 'projected' in option && option.projected}
										{@const optionProjected = option.projected}
										<div class="decision-card__projected">
											<span class="projected-meter" class:projected-meter--danger={optionProjected.isDangerous}>
												{optionProjected.meterLabel}
												{optionProjected.beforeValue}% → {optionProjected.afterValue}%
											</span>
											{#if optionProjected.recoveryDelta !== 0}
												<span class="projected-recovery" class:projected-recovery--negative={optionProjected.recoveryDelta < 0} class:projected-recovery--positive={optionProjected.recoveryDelta > 0}>
													{#if optionProjected.recoveryDelta > 0}
														+{optionProjected.recoveryDelta} recovery
													{:else}
														{optionProjected.recoveryDelta} recovery
													{/if}
												</span>
											{/if}
											{#if optionProjected.partWear && optionProjected.primaryMeterKey !== 'hullCondition' && option.id !== 'field_repair'}
												{@const actionSlot = option.id === 'signal_tune' ? 'drill' : option.id === 'clear_pump_problem' ? 'pump' : 'hull'}
												<span class="projected-wear">
													· {actionSlot.charAt(0).toUpperCase() + actionSlot.slice(1)} −{optionProjected.partWear} Condition
												</span>
											{/if}
											{#if optionProjected.partWear && optionProjected.primaryMeterKey === 'hullCondition' && option.id !== 'field_repair'}
												<span class="projected-wear">
													· Hull −{optionProjected.partWear} Condition
												</span>
											{/if}
										</div>
									{/if}

									{#if !option.enabled && option.disabledReason}
										<div class="decision-card__disabled-reason">
											{option.disabledReason}
										</div>
									{/if}
								</button>
							{/each}
						</div>
					</form>
				{:else if openRun.recalled}
					<p class="window-skipped">Skipped — run was recalled before this window</p>
				{:else}
					<p class="window-waiting">Waiting for earlier windows to resolve...</p>
				{/if}
			</article>
		{/each}
	</div>
</section>

<!-- Footer Actions -->
{#if runReadyToResolve && (openRun.recalled || thumperDemo.status === 'claimable')}
	<div class="footer-claim">
		<p class="footer-claim__prompt">Your thumper run is complete and ready to claim.</p>
		<a href="/claim" class="claim-button">Claim Thumper Results →</a>
	</div>
{:else if !openRun.recalled && thumperDemo.status === 'active'}
	<p class="footer-note">
		Unanswered windows will be safely resolved at claim time. No kits are ever spent automatically.
	</p>
{/if}

<style>
/* Status Header */
.run-status {
	margin: 1rem 0;
}

.status-banner {
	display: flex;
	align-items: center;
	gap: 0.75rem;
	padding: 0.875rem 1rem;
	border-radius: 0.375rem;
	border: 2px solid;
}

.status-banner--active {
	background: var(--accent-info-bg);
	border-color: var(--accent-info);
}

.status-banner--finished {
	background: var(--accent-success-bg);
	border-color: var(--accent-success);
}

.status-banner--recalled {
	background: var(--accent-warning-bg);
	border-color: var(--accent-warning);
}

.status-indicator {
	font-size: 1.25rem;
	line-height: 1;
}

.timer-pulse {
	width: 0.75rem;
	height: 0.75rem;
	background: var(--accent-info);
	border-radius: 50%;
	animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
	0%, 100% { opacity: 1; }
	50% { opacity: 0.5; }
}

.status-content {
	display: flex;
	flex-direction: column;
	flex: 1;
	gap: 0.125rem;
}

.status-detail {
	font-size: 0.875rem;
	color: var(--text-muted);
}

.timer-display {
	display: flex;
	flex-direction: column;
	align-items: flex-end;
	gap: 0.125rem;
}

.timer-value {
	font-size: 1.5rem;
	font-weight: 700;
	font-variant-numeric: tabular-nums;
	color: var(--accent-info);
}

.timer-label {
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}

.claim-link {
	padding: 0.5rem 1rem;
	background: var(--accent-success);
	color: #052e16;
	text-decoration: none;
	border-radius: 0.25rem;
	font-weight: 500;
}

/* Frame Context */
.frame-context {
	font-size: 0.875rem;
	color: var(--text-muted);
	margin: 0.5rem 0;
}

.push-tag {
	display: inline-block;
	margin-left: 0.5rem;
	padding: 0.125rem 0.5rem;
	background: var(--surface-hover);
	border-radius: 0.25rem;
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

/* Thumper Condition Bar */
.thumper-condition-bar {
	display: flex;
	align-items: center;
	gap: 0.5rem;
	padding: 0.5rem 0.75rem;
	background: var(--surface-inset);
	border: 1px solid var(--border-subtle);
	border-radius: 0.375rem;
	font-size: 0.875rem;
	margin: 0.5rem 0;
	flex-wrap: wrap;
}

.condition-label {
	color: var(--text-muted);
	font-weight: 500;
}

.condition-value {
	font-weight: 600;
	font-variant-numeric: tabular-nums;
}

.condition-value--solid {
	color: var(--accent-success);
}

.condition-value--worn {
	color: var(--accent-warning);
}

.condition-value--failing {
	color: var(--accent-danger);
}

.condition-weakest {
	color: var(--text-muted);
	font-size: 0.8125rem;
}

.gear-penalty-callout {
	margin: 0 0 1rem 0;
	padding: 0.875rem 1rem;
	border-radius: 0.5rem;
	border: 1px solid rgba(251, 191, 36, 0.35);
	background: var(--accent-warning-bg, rgba(251, 191, 36, 0.12));
	color: var(--text-primary);
}

.gear-penalty-title {
	margin: 0 0 0.35rem 0;
	font-weight: 600;
	color: var(--accent-warning, #fbbf24);
}

.gear-penalty-body,
.gear-penalty-foot {
	margin: 0.35rem 0 0;
	font-size: 0.9rem;
	color: var(--text-secondary);
	line-height: 1.45;
}

.gear-penalty-foot a {
	color: var(--accent-link, #60a5fa);
}

/* Run Meters */
.run-meters {
	margin: 1.5rem 0;
	padding: 1rem;
	background: var(--surface-inset);
	border-radius: 0.5rem;
	border: 1px solid var(--border-subtle);
}

.meter {
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
}

.meter--primary {
	justify-content: space-between;
	padding-bottom: 0.75rem;
	margin-bottom: 0.75rem;
	border-bottom: 1px solid var(--border-subtle);
}

.meter-label {
	font-size: 0.875rem;
	color: var(--text-muted);
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.meter--primary .meter-label {
	font-size: 1rem;
	font-weight: 500;
	color: var(--text-secondary);
}

.meter-value {
	font-weight: 600;
	color: var(--text-secondary);
}

.meter-value--primary {
	font-size: 2rem;
	font-weight: 700;
	color: var(--text-primary);
}

.meter-unit {
	font-size: 1rem;
	font-weight: 400;
	color: var(--text-muted);
}

.meter-delta {
	font-size: 1rem;
	font-weight: 600;
	padding: 0.125rem 0.5rem;
	border-radius: 0.25rem;
	font-variant-numeric: tabular-nums;
}

.meter-delta--negative {
	color: var(--accent-danger);
	background: var(--accent-danger-bg);
}

.meter-delta--positive {
	color: var(--accent-success-text);
	background: rgba(74, 222, 128, 0.15);
}

.meters-secondary {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(8rem, 1fr));
	gap: 0.75rem;
}

.meters-secondary .meter {
	flex-direction: column;
	gap: 0.25rem;
}

.meters-secondary .meter-label {
	font-size: 0.75rem;
}

.meters-secondary .meter-value {
	font-size: 1.25rem;
	font-variant-numeric: tabular-nums;
}

/* Event Windows */
.event-windows {
	margin: 2rem 0;
}

.section-header {
	margin-bottom: 1rem;
}

.section-header h2 {
	margin: 0 0 0.5rem 0;
	font-size: 1.25rem;
}

.section-help {
	margin: 0;
	font-size: 0.875rem;
	color: var(--text-muted);
}

.windows-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Window Cards */
.window-card {
	border: 2px solid var(--border-subtle);
	border-radius: 0.5rem;
	padding: 1rem;
	background: var(--surface-raised);
}

.window-card--minor {
	border-color: var(--border-muted);
}

.window-card--serious {
	border-color: var(--accent-danger);
	background: var(--accent-danger-bg);
}

.window-card--quiet {
	border-color: var(--border-muted);
	background: var(--surface-hover);
	opacity: 0.85;
}

.window-card--resolved {
	opacity: 0.85;
	background: var(--surface-inset);
}

.window-card--pending {
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.window-header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.75rem;
	margin-bottom: 1rem;
	padding-bottom: 0.75rem;
	border-bottom: 1px solid var(--border-subtle);
}

.window-title {
	display: flex;
	align-items: baseline;
	gap: 0.5rem;
	margin: 0;
	font-size: 1.125rem;
}

.window-number {
	font-size: 0.875rem;
	font-weight: 400;
	color: var(--text-muted);
	font-variant-numeric: tabular-nums;
}

.complication-name {
	font-weight: 600;
	color: var(--text-secondary);
}

.complication-name--serious {
	color: var(--accent-danger);
	font-weight: 700;
}

.severity-badge {
	padding: 0.25rem 0.625rem;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.severity-badge--minor {
	background: var(--surface-hover);
	color: var(--text-muted);
}

.severity-badge--serious {
	background: var(--accent-danger-bg);
	color: var(--accent-danger);
	border: 1px solid rgba(248, 113, 113, 0.3);
}

.severity-badge--quiet {
	background: var(--surface-inset);
	color: var(--text-muted);
}

.complication-name--quiet {
	color: var(--text-muted);
	font-style: italic;
}

.window-quiet-message {
	margin: 0;
	font-size: 0.875rem;
	color: var(--text-muted);
	font-style: italic;
}

/* Resolution Summary */
.resolution-summary {
	display: flex;
	flex-direction: column;
	gap: 0.75rem;
}

.response-taken {
	display: flex;
	align-items: center;
	gap: 0.5rem;
}

.response-label {
	font-size: 0.875rem;
	color: var(--text-muted);
}

.response-choice {
	color: var(--text-primary);
}

.outcome-details {
	font-size: 0.875rem;
	padding: 0.75rem;
	border-radius: 0.375rem;
	margin: 0;
}

.window-skipped,
.window-waiting {
	margin: 0;
	font-size: 0.875rem;
	color: var(--text-muted);
	font-style: italic;
}

/* Decision Cards */
.decision-form {
	margin: 0;
}

.decision-cards {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
	gap: 0.75rem;
}

.decision-card {
	display: flex;
	flex-direction: column;
	gap: 0.375rem;
	padding: 1rem;
	border: 2px solid var(--border-subtle);
	border-radius: 0.5rem;
	background: var(--surface-raised);
	cursor: pointer;
	text-align: left;
	font-family: inherit;
	transition: all 0.15s ease;
}

.decision-card:hover:not(:disabled) {
	border-color: var(--border-muted);
	transform: translateY(-1px);
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
}

.decision-card:active:not(:disabled) {
	transform: translateY(0);
}

.decision-card--matching {
	border-color: var(--accent-success);
	background: var(--accent-success-bg);
}

.decision-card--matching:hover:not(:disabled) {
	border-color: var(--accent-success);
}

.decision-card--recall {
	border-color: var(--accent-warning);
	background: var(--accent-warning-bg);
}

.decision-card--recall:hover:not(:disabled) {
	border-color: #d97706;
}

.decision-card--hold {
	border-color: var(--border-muted);
	background: var(--surface-inset);
}

.decision-card--hold:hover:not(:disabled) {
	border-color: var(--text-muted);
}

.decision-card--field-repair {
	border-color: var(--accent-info);
	background: var(--accent-info-bg);
}

.decision-card--field-repair:hover:not(:disabled) {
	border-color: #3b82f6;
}

.decision-card--disabled {
	opacity: 0.6;
	cursor: not-allowed;
}

.decision-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	gap: 0.5rem;
}

.decision-card__title {
	font-weight: 600;
	font-size: 1rem;
	color: var(--text-primary);
}

.decision-card__badge {
	padding: 0.125rem 0.375rem;
	background: var(--accent-success);
	color: #052e16;
	font-size: 0.625rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border-radius: 0.25rem;
}

.decision-card__subheader {
	font-size: 0.75rem;
	color: var(--text-muted);
}

.decision-card__stakes {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	margin-top: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid var(--border-subtle);
}

.stakes-label {
	font-size: 0.625rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: var(--text-muted);
}

.stakes-value {
	font-size: 0.875rem;
	color: var(--text-secondary);
	line-height: 1.4;
}

.decision-card__projected {
	margin-top: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid var(--border-subtle);
	display: flex;
	flex-wrap: wrap;
	gap: 0.35rem;
	align-items: center;
	font-size: 0.8125rem;
}

.projected-meter {
	font-weight: 600;
	color: var(--text-primary);
	font-variant-numeric: tabular-nums;
}

.projected-meter--danger {
	color: var(--accent-danger);
	background: var(--accent-danger-bg);
	padding: 0.125rem 0.375rem;
	border-radius: 0.25rem;
}

.projected-recovery {
	font-variant-numeric: tabular-nums;
}

.projected-recovery--negative {
	color: var(--accent-danger);
}

.projected-recovery--positive {
	color: var(--accent-success-text);
}

.projected-wear {
	color: var(--text-muted);
}

.decision-card--disabled .stakes-value {
	color: var(--text-muted);
}

.decision-card__disabled-reason {
	font-size: 0.75rem;
	color: var(--accent-danger);
	margin-top: 0.25rem;
}

/* Footer */
.footer-claim {
	margin: 2rem 0;
	padding: 1.5rem;
	background: var(--accent-success-bg);
	border: 2px solid var(--accent-success);
	border-radius: 0.5rem;
	text-align: center;
}

.footer-claim__prompt {
	margin: 0 0 1rem 0;
	font-size: 1.125rem;
	color: var(--accent-success-text);
}

.claim-button {
	display: inline-block;
	padding: 0.75rem 1.5rem;
	background: var(--accent-success);
	color: #052e16;
	text-decoration: none;
	border-radius: 0.375rem;
	font-weight: 600;
}

.claim-button:hover {
	background: #86efac;
}

.footer-note {
	font-size: 0.875rem;
	color: var(--text-muted);
	margin: 1.5rem 0;
}

/* Flash messages */
.flash {
	padding: 0.75rem 1rem;
	border-radius: 0.375rem;
	margin: 1rem 0;
}

.flash--success {
	background: var(--accent-success-bg);
	border: 1px solid rgba(74, 222, 128, 0.3);
	color: var(--accent-success-text);
}

.flash--error {
	background: var(--accent-danger-bg);
	border: 1px solid rgba(248, 113, 113, 0.3);
	color: var(--accent-danger);
}

/* Mobile adjustments */
@media (max-width: 640px) {
	.decision-cards {
		grid-template-columns: 1fr;
	}

	.meters-secondary {
		grid-template-columns: repeat(2, 1fr);
	}

	.status-banner {
		flex-wrap: wrap;
	}

	.timer-display {
		width: 100%;
		flex-direction: row;
		justify-content: flex-end;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}
}
</style>
