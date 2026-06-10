<script lang="ts">
import { enhance } from '$app/forms';
import { invalidateAll } from '$app/navigation';
import { complicationDisplayName } from '@async-frontier-mmo/domain';
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
	if (!prior.every((window) => window.responded)) return false;
	const current = eventWindows.find((window) => window.windowIndex === windowIndex);
	return current ? !current.responded : false;
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
				<span class="timer-value">{displaySeconds ?? thumperDemo.secondsRemaining}s</span>
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
				<span class="meter-label">Hull Condition</span>
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
			<article class="window-card {severityClass(window.severity)}" class:window-card--pending={!window.responded && isActiveWindow(window.windowIndex)} class:window-card--resolved={window.responded}>
				<!-- Window Header -->
				<header class="window-header">
					<h3 class="window-title">
						<span class="window-number">#{window.windowIndex}</span>
						<span class="complication-name" class:complication-name--serious={window.severity === 'serious'}>
							{severityTitle(window.severity, window.complication)}
						</span>
					</h3>
					{#if window.severity === 'serious'}
						<span class="severity-badge severity-badge--serious">SERIOUS</span>
					{:else}
						<span class="severity-badge severity-badge--minor">Minor</span>
					{/if}
				</header>

				{#if window.responded}
					<!-- Resolved State -->
					<div class="resolution-summary">
						<div class="response-taken">
							<span class="response-label">Response:</span>
							<strong class="response-choice">{optionHeaderLabel(window.chosenResponse ?? '', window.matchingActionLabel)}</strong>
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
										<span class="decision-card__title">{optionHeaderLabel(option.id, window.matchingActionLabel)}</span>
										{#if isMatchingAction && option.id !== 'field_repair'}
											<span class="decision-card__badge">Recommended</span>
										{/if}
									</div>

									{#if optionSubheader(option.id, window.matchingActionLabel)}
										<span class="decision-card__subheader">{optionSubheader(option.id, window.matchingActionLabel)}</span>
									{/if}

									{#if option.effectLine}
										<div class="decision-card__stakes">
											<span class="stakes-label">Outcome:</span>
											<span class="stakes-value">{option.effectLine}</span>
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
	background: #f0f9ff;
	border-color: #0ea5e9;
}

.status-banner--finished {
	background: #f0fdf4;
	border-color: #22c55e;
}

.status-banner--recalled {
	background: #fef9c3;
	border-color: #eab308;
}

.status-indicator {
	font-size: 1.25rem;
	line-height: 1;
}

.timer-pulse {
	width: 0.75rem;
	height: 0.75rem;
	background: #0ea5e9;
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
	color: #666;
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
	color: #0ea5e9;
}

.timer-label {
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: #666;
}

.claim-link {
	padding: 0.5rem 1rem;
	background: #22c55e;
	color: white;
	text-decoration: none;
	border-radius: 0.25rem;
	font-weight: 500;
}

/* Frame Context */
.frame-context {
	font-size: 0.875rem;
	color: #666;
	margin: 0.5rem 0;
}

.push-tag {
	display: inline-block;
	margin-left: 0.5rem;
	padding: 0.125rem 0.5rem;
	background: #f3f4f6;
	border-radius: 0.25rem;
	font-size: 0.75rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

/* Run Meters */
.run-meters {
	margin: 1.5rem 0;
	padding: 1rem;
	background: #f9fafb;
	border-radius: 0.5rem;
	border: 1px solid #e5e7eb;
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
	border-bottom: 1px solid #e5e7eb;
}

.meter-label {
	font-size: 0.875rem;
	color: #6b7280;
	text-transform: uppercase;
	letter-spacing: 0.05em;
}

.meter--primary .meter-label {
	font-size: 1rem;
	font-weight: 500;
	color: #374151;
}

.meter-value {
	font-weight: 600;
	color: #374151;
}

.meter-value--primary {
	font-size: 2rem;
	font-weight: 700;
	color: #111827;
}

.meter-unit {
	font-size: 1rem;
	font-weight: 400;
	color: #6b7280;
}

.meter-delta {
	font-size: 1rem;
	font-weight: 600;
	padding: 0.125rem 0.5rem;
	border-radius: 0.25rem;
	font-variant-numeric: tabular-nums;
}

.meter-delta--negative {
	color: #dc2626;
	background: #fee2e2;
}

.meter-delta--positive {
	color: #16a34a;
	background: #dcfce7;
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
	color: #666;
}

.windows-list {
	display: flex;
	flex-direction: column;
	gap: 1rem;
}

/* Window Cards */
.window-card {
	border: 2px solid #e5e7eb;
	border-radius: 0.5rem;
	padding: 1rem;
	background: white;
}

.window-card--minor {
	border-color: #d1d5db;
}

.window-card--serious {
	border-color: #dc2626;
	background: #fef2f2;
}

.window-card--resolved {
	opacity: 0.85;
	background: #f9fafb;
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
	border-bottom: 1px solid #e5e7eb;
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
	color: #9ca3af;
	font-variant-numeric: tabular-nums;
}

.complication-name {
	font-weight: 600;
	color: #374151;
}

.complication-name--serious {
	color: #991b1b;
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
	background: #f3f4f6;
	color: #6b7280;
}

.severity-badge--serious {
	background: #fee2e2;
	color: #dc2626;
	border: 1px solid #fecaca;
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
	color: #6b7280;
}

.response-choice {
	color: #111827;
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
	color: #6b7280;
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
	border: 2px solid #e5e7eb;
	border-radius: 0.5rem;
	background: white;
	cursor: pointer;
	text-align: left;
	font-family: inherit;
	transition: all 0.15s ease;
}

.decision-card:hover:not(:disabled) {
	border-color: #9ca3af;
	transform: translateY(-1px);
	box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
}

.decision-card:active:not(:disabled) {
	transform: translateY(0);
}

.decision-card--matching {
	border-color: #22c55e;
	background: #f0fdf4;
}

.decision-card--matching:hover:not(:disabled) {
	border-color: #16a34a;
}

.decision-card--recall {
	border-color: #eab308;
	background: #fefce8;
}

.decision-card--recall:hover:not(:disabled) {
	border-color: #ca8a04;
}

.decision-card--hold {
	border-color: #d1d5db;
	background: #f9fafb;
}

.decision-card--hold:hover:not(:disabled) {
	border-color: #9ca3af;
}

.decision-card--field-repair {
	border-color: #0ea5e9;
	background: #f0f9ff;
}

.decision-card--field-repair:hover:not(:disabled) {
	border-color: #0284c7;
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
	color: #111827;
}

.decision-card__badge {
	padding: 0.125rem 0.375rem;
	background: #22c55e;
	color: white;
	font-size: 0.625rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	border-radius: 0.25rem;
}

.decision-card__subheader {
	font-size: 0.75rem;
	color: #6b7280;
}

.decision-card__stakes {
	display: flex;
	flex-direction: column;
	gap: 0.125rem;
	margin-top: 0.5rem;
	padding-top: 0.5rem;
	border-top: 1px solid #e5e7eb;
}

.stakes-label {
	font-size: 0.625rem;
	text-transform: uppercase;
	letter-spacing: 0.05em;
	color: #9ca3af;
}

.stakes-value {
	font-size: 0.875rem;
	color: #374151;
	line-height: 1.4;
}

.decision-card--disabled .stakes-value {
	color: #9ca3af;
}

.decision-card__disabled-reason {
	font-size: 0.75rem;
	color: #dc2626;
	margin-top: 0.25rem;
}

/* Footer */
.footer-claim {
	margin: 2rem 0;
	padding: 1.5rem;
	background: #f0fdf4;
	border: 2px solid #22c55e;
	border-radius: 0.5rem;
	text-align: center;
}

.footer-claim__prompt {
	margin: 0 0 1rem 0;
	font-size: 1.125rem;
	color: #166534;
}

.claim-button {
	display: inline-block;
	padding: 0.75rem 1.5rem;
	background: #22c55e;
	color: white;
	text-decoration: none;
	border-radius: 0.375rem;
	font-weight: 600;
}

.claim-button:hover {
	background: #16a34a;
}

.footer-note {
	font-size: 0.875rem;
	color: #6b7280;
	margin: 1.5rem 0;
}

/* Flash messages */
.flash {
	padding: 0.75rem 1rem;
	border-radius: 0.375rem;
	margin: 1rem 0;
}

.flash--success {
	background: #f0fdf4;
	border: 1px solid #bbf7d0;
	color: #166534;
}

.flash--error {
	background: #fef2f2;
	border: 1px solid #fecaca;
	color: #991b1b;
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
