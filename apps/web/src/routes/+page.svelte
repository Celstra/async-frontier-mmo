<script lang="ts">
	import { invalidateAll } from '$app/navigation';
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
	const thumperDemo = $derived(
		form?.claimed ? null : (data.thumperDemo ?? form?.thumperDemo)
	);
	const openRun = $derived(
		form?.claimed ? null : (data.openRun ?? form?.openRun ?? null)
	);
	const eventWindows = $derived(form?.eventWindows ?? data.eventWindows ?? []);
	const runReadyToResolve = $derived(form?.runReadyToResolve ?? data.runReadyToResolve ?? false);
	const claimResult = $derived(form?.claimResult ?? null);
	const thumperSource = $derived(
		form?.claimed ? 'claim' : data.thumperDemo ? 'load' : form?.thumperDemo ? 'action' : 'load'
	);
	const canClaimRun = $derived(openRun?.claimResolutionAvailable === true);
	const canSubmitClaim = $derived(
		canClaimRun && (openRun?.recalled === true || thumperDemo?.status === 'claimable') && runReadyToResolve
	);

	let displaySeconds = $state<number | null>(null);

	function optionLabel(optionId: string): string {
		return optionId === 'recall_early' ? 'Recall Early' : optionId;
	}

	function isActiveWindow(windowIndex: number): boolean {
		if (openRun?.recalled) {
			return false;
		}
		const prior = eventWindows.filter((window) => window.windowIndex < windowIndex);
		if (!prior.every((window) => window.responded)) {
			return false;
		}
		const current = eventWindows.find((window) => window.windowIndex === windowIndex);
		return current ? !current.responded : false;
	}

	$effect(() => {
		if (!thumperDemo || thumperDemo.status !== 'active') {
			displaySeconds = thumperDemo?.secondsRemaining ?? null;
			return;
		}

		displaySeconds = thumperDemo.secondsRemaining;

		let intervalId = setInterval(() => {
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

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

{#if data.survey && !thumperDemo}
	<h2>Red Mesa survey (first session)</h2>
	<ul>
		{#each data.survey.signals as signal}
			<li>
				<strong>{signal.displayName}</strong>
				{#if signal.recommended}(recommended){/if}
				— {signal.teachingNote}
			</li>
		{/each}
	</ul>

	<form method="POST" action="?/deploy">
		<fieldset>
			<legend>Deploy thumper on signal</legend>
			{#each data.survey.signals as signal}
				<label>
					<input
						type="radio"
						name="targetResourceId"
						value={signal.resourceId}
						checked={signal.recommended}
					/>
					{signal.displayName}
				</label>
			{/each}
		</fieldset>
		<label>
			<input type="checkbox" name="isPushRun" value="true" />
			Push run (3 event windows, higher projected recovery)
		</label>
		<p>
			<small>
				Push is ignored on your first scripted Veyrith tutorial deploy. Repeat and non-tutorial
				deploys may use it.
			</small>
		</p>
		<button type="submit">Deploy thumper</button>
	</form>
{:else if thumperDemo}
	<p>Thumper running on <strong>{openRun?.targetDisplayName ?? 'unknown signal'}</strong>.</p>
	{#if openRun?.isPushRun}
		<p><small>Push run — {eventWindows.length} event windows</small></p>
	{/if}
	{#if openRun?.recalled}
		<p><small>Run ended early — secured progress kept; claim when ready.</small></p>
	{/if}

	{#if eventWindows.length > 0}
		<h2>Event windows</h2>
		<ul>
			{#each eventWindows as window}
				<li>
					<strong>Window {window.windowIndex}:</strong> {window.complication}
					{#if window.responded}
						— responded: {optionLabel(window.chosenResponse ?? '')}
					{:else if isActiveWindow(window.windowIndex)}
						<form method="POST" action="?/respond" style="display: inline">
							<input type="hidden" name="windowIndex" value={window.windowIndex} />
							{#each window.responseOptions as option}
								<button
									type="submit"
									name="chosenResponse"
									value={option.id}
									disabled={!option.enabled}
									title={option.disabledReason ?? ''}
								>
									{optionLabel(option.id)}
								</button>
							{/each}
						</form>
						{#each window.responseOptions as option}
							{#if !option.enabled && option.disabledReason}
								<p><small>{option.disabledReason}</small></p>
							{/if}
						{/each}
					{:else if openRun?.recalled}
						— skipped after recall
					{:else}
						— waiting for earlier windows
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if canSubmitClaim}
	<form method="POST" action="?/claim">
		<button type="submit">Claim thumper</button>
	</form>
{:else if thumperDemo && canClaimRun && !runReadyToResolve}
	<p>Resolve event windows or choose Recall Early before claiming.</p>
{:else if thumperDemo?.status === 'claimable' && !canClaimRun}
	<p>Seeded run claim resolution is not available yet. Practice responding to event windows.</p>
{:else if thumperDemo && canClaimRun && !openRun?.recalled && thumperDemo.status !== 'claimable'}
	<p>Wait for the run timer or choose Recall Early to end the run.</p>
{/if}

{#if form?.claimed && claimResult}
	<p>
		<strong>Claim result ({claimResult.resolutionType}):</strong>
		{claimResult.recoveredQuantity} {claimResult.targetResourceId}
		(waste {claimResult.wasteQuantity}, forfeited {claimResult.forfeitedRecovery}) —
		{claimResult.explanation}
	</p>
{/if}

{#if import.meta.env.DEV}
	<p data-dev-note>
		<strong>Dev:</strong> resource stat codes from <code>shared</code>:
		{resourceStatCodes.join(', ')}
	</p>
	<p data-dev-note>
		<strong>Dev:</strong> thumper state from server ({thumperSource}):
		{#if form?.claimed}
			claimed
		{:else if thumperDemo}
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
{/if}
