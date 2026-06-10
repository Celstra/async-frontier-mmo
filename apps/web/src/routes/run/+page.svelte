<script lang="ts">
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

function optionLabel(optionId: string, matchingActionLabel: string): string {
	if (optionId === 'recall_early') return 'Recall Early';
	if (optionId === 'hold') return 'Hold / ignore';
	if (optionId === 'field_repair') {
		return `Field Repair (${fieldRepairKitCount} kit${fieldRepairKitCount === 1 ? '' : 's'})`;
	}
	return matchingActionLabel;
}

function isActiveWindow(windowIndex: number): boolean {
	if (openRun.recalled) return false;
	const prior = eventWindows.filter((window) => window.windowIndex < windowIndex);
	if (!prior.every((window) => window.responded)) return false;
	const current = eventWindows.find((window) => window.windowIndex === windowIndex);
	return current ? !current.responded : false;
}

function chosenLabel(chosenResponse: string, matchingActionLabel: string): string {
	return optionLabel(chosenResponse, matchingActionLabel);
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

<h1>Thumper Run</h1>

<p>
	Extracting <strong>{openRun.targetDisplayName}</strong>
	{#if openRun.isPushRun}
		<small>(push run — {eventWindows.length} windows)</small>
	{/if}
</p>

<p>
	<small>
		Frame: {data.frameLabel} — {data.frameVerb}. Event windows are short attention moments inside the
		async run — respond when you can; the timer keeps moving.
	</small>
</p>

{#if openRun.recalled}
	<p><strong>Recalled early</strong> — secured progress kept. Return to Pilot Home to claim.</p>
{:else if thumperDemo.status === 'active'}
	<p>
		Run timer: <strong>{displaySeconds ?? thumperDemo.secondsRemaining}s</strong> remaining
		<small>(client countdown; server timestamps are authoritative at claim)</small>
	</p>
{:else if thumperDemo.status === 'claimable'}
	<p><strong>Run finished</strong> — return to Pilot Home to claim results.</p>
{/if}

<section class="run-meters">
	<h2>Run state (Decision 005)</h2>
	<p>
		<small>
			These meters are player-facing estimates at the current moment. Claim applies your window
			choices — projected recovery may drop after hold, strain, or Recall Early.
		</small>
	</p>
	{#if runMeters}
		<dl class="meter-grid">
			<div>
				<dt>Projected Recovery</dt>
				<dd>{runMeters.projectedRecovery} units</dd>
			</div>
			<div>
				<dt>Signal Lock</dt>
				<dd>{runMeters.signalLock}%</dd>
			</div>
			<div>
				<dt>Pump Flow</dt>
				<dd>{runMeters.pumpFlow}%</dd>
			</div>
			<div>
				<dt>Threat Pressure</dt>
				<dd>{runMeters.threatPressure}%</dd>
			</div>
			<div>
				<dt>Hull Condition</dt>
				<dd>{runMeters.hullCondition}%</dd>
			</div>
		</dl>
	{/if}
</section>

<section class="event-windows">
	<h2>Event windows</h2>
	<p>
		<small>
			Each window: matching action (frame-flavored when your frame specializes), hold, or Recall Early.
			Field Repair kits: {fieldRepairKitCount} owned.
		</small>
	</p>

	{#if form?.message}
		<p><strong>{form.message}</strong></p>
	{/if}

	<ul>
		{#each eventWindows as window}
			<li class="window-card">
				<h3>
					Window {window.windowIndex}: {complicationDisplayName(window.complication)}
				</h3>
				{#if window.responded}
					<p>Responded: <strong>{chosenLabel(window.chosenResponse ?? '', window.matchingActionLabel)}</strong></p>
				{:else if isActiveWindow(window.windowIndex)}
					<form method="POST" action="?/respond" class="response-form">
						<input type="hidden" name="windowIndex" value={window.windowIndex} />
						{#each window.responseOptions as option}
							<button
								type="submit"
								name="chosenResponse"
								value={option.id}
								disabled={!option.enabled}
								title={option.disabledReason ?? ''}
							>
								{optionLabel(option.id, window.matchingActionLabel)}
							</button>
						{/each}
					</form>
					{#each window.responseOptions as option}
						{#if !option.enabled && option.disabledReason}
							<p class="disabled-reason"><small>{option.disabledReason}</small></p>
						{/if}
					{/each}
				{:else if openRun.recalled}
					<p><small>Skipped after Recall Early</small></p>
				{:else}
					<p><small>Waiting for earlier windows</small></p>
				{/if}
			</li>
		{/each}
	</ul>
</section>

{#if runReadyToResolve && (openRun.recalled || thumperDemo.status === 'claimable')}
	<p><a href="/">Claim thumper on Pilot Home →</a></p>
{:else if !openRun.recalled && thumperDemo.status === 'active'}
	<p>
		<small>
			Absent-player fallback (Decision 005): if you do not respond, unresolved windows resolve under
			conservative defaults at claim — no auto kit spend, no surprise run deletion. Jobs/workers
			apply that later; for now, respond before the timer ends.
		</small>
	</p>
{/if}

<style>
	.meter-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
		gap: 0.75rem;
	}

	.window-card {
		border: 1px solid #ccc;
		padding: 0.75rem 1rem;
		margin: 0.75rem 0;
		list-style: none;
	}

	.response-form {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.5rem;
	}

	.disabled-reason {
		margin: 0.25rem 0 0;
		color: #666;
	}
</style>
