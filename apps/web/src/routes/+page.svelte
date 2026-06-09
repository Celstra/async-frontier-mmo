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
	const claimResult = $derived(form?.claimResult ?? null);
	const thumperSource = $derived(
		form?.claimed ? 'claim' : data.thumperDemo ? 'load' : form?.thumperDemo ? 'action' : 'load'
	);
	const allWindowsResponded = $derived(
		eventWindows.length > 0 && eventWindows.every((window) => window.responded)
	);

	let displaySeconds = $state<number | null>(null);

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
		<button type="submit">Deploy thumper</button>
	</form>
{:else if thumperDemo}
	<p>Thumper running on <strong>{openRun?.targetDisplayName ?? 'unknown signal'}</strong>.</p>

	{#if eventWindows.length > 0}
		<h2>Event windows</h2>
		<ul>
			{#each eventWindows as window}
				<li>
					<strong>Window {window.windowIndex}:</strong> {window.complication}
					{#if window.responded}
						— responded: {window.chosenResponse}
					{:else}
						<form method="POST" action="?/respond" style="display: inline">
							<input type="hidden" name="windowIndex" value={window.windowIndex} />
							<button type="submit" name="chosenResponse" value={window.matchingAction}>
								{window.matchingAction}
							</button>
							<button type="submit" name="chosenResponse" value="hold">Hold</button>
						</form>
					{/if}
				</li>
			{/each}
		</ul>
	{/if}
{/if}

{#if thumperDemo?.status === 'claimable' && (eventWindows.length === 0 || allWindowsResponded)}
	<form method="POST" action="?/claim">
		<button type="submit">Claim thumper</button>
	</form>
{:else if thumperDemo?.status === 'claimable' && eventWindows.length > 0}
	<p>Resolve all event windows before claiming.</p>
{/if}

{#if form?.claimed && claimResult}
	<p>
		<strong>Claim result:</strong> {claimResult.recoveredQuantity} {claimResult.targetResourceId}
		(waste {claimResult.wasteQuantity}) — {claimResult.explanation}
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
