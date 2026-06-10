<script lang="ts">
	import { enhance } from '$app/forms';
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
	const thumperDemo = $derived(data.thumperDemo ?? null);
	const openRun = $derived(data.openRun ?? null);
	const eventWindows = $derived(data.eventWindows ?? []);
	const runReadyToResolve = $derived(data.runReadyToResolve ?? false);
	const bloomRotation = $derived(form?.bloomRotation ?? null);
	const hasCompletedTutorial = $derived(
		form?.hasCompletedTutorial ?? data.hasCompletedTutorial ?? false
	);
	const needsFrameChoice = $derived(data.needsFrameChoice ?? false);
	const frameChoiceOptions = $derived(data.frameChoiceOptions ?? []);
	const frameLabel = $derived(data.frameLabel ?? '');
	const frameVerb = $derived(data.frameVerb ?? '');
	const activeBloomName = $derived(data.activeBloomName ?? '');
	const runStatusSummary = $derived(data.runStatusSummary ?? '');
	const resourceSummary = $derived(data.resourceSummary ?? []);
	const equippedScannerSummary = $derived(data.equippedScannerSummary ?? 'Basic Scanner Mk 0');
	const equippedPartsSummary = $derived(data.equippedPartsSummary ?? null);
	const suggestedNextAction = $derived(data.suggestedNextAction ?? null);

	const thumperSource = $derived(data.thumperDemo ? 'load' : 'none');
	const canSubmitClaim = $derived(
		(openRun?.recalled === true || thumperDemo?.status === 'claimable') && runReadyToResolve
	);

	let displaySeconds = $state<number | null>(null);

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

<h1>Pilot Home</h1>

{#if needsFrameChoice}
	<section class="frame-choice">
		<h2>Choose your frame</h2>
		<p>How do you operate on the frontier?</p>
		{#if form?.message}
			<p class="flash flash--error">{form.message}</p>
		{/if}
		<form method="POST" action="?/chooseFrame" use:enhance>
			{#each frameChoiceOptions as option}
				<label class="frame-option">
					<input type="radio" name="frameId" value={option.id} required />
					<strong>{option.title}</strong>
					<span>{option.verb}</span>
				</label>
			{/each}
			<button type="submit">Confirm frame</button>
		</form>
	</section>
{:else}
	<section class="pilot-home-summary">
		<dl>
			<div>
				<dt>Frame</dt>
				<dd>{frameLabel} — {frameVerb}</dd>
			</div>
			<div>
				<dt>Active bloom</dt>
				<dd>{activeBloomName}</dd>
			</div>
			<div>
				<dt>Run status</dt>
				<dd>{runStatusSummary}</dd>
			</div>
			<div>
				<dt>Resources</dt>
				<dd>
					{#if resourceSummary.length === 0}
						None yet — survey and claim to fill inventory.
					{:else}
						<ul>
							{#each resourceSummary as stack}
								<li>{stack.displayName} × {stack.quantity}</li>
							{/each}
						</ul>
					{/if}
				</dd>
			</div>
			<div>
				<dt>Equipped scanner</dt>
				<dd>{equippedScannerSummary}</dd>
			</div>
			{#if equippedPartsSummary}
				<div>
					<dt>Equipped thumper parts</dt>
					<dd>
						Drill: {equippedPartsSummary.drill} · Pump: {equippedPartsSummary.pump} · Hull:
						{equippedPartsSummary.hull}
					</dd>
				</div>
			{/if}
		</dl>

		{#if suggestedNextAction}
			<section class="suggested-next">
				<h2>Suggested next</h2>
				<p>
					{#if suggestedNextAction.href}
						<a href={suggestedNextAction.href}><strong>{suggestedNextAction.label}</strong></a>
					{:else}
						<strong>{suggestedNextAction.label}</strong>
					{/if}
					— {suggestedNextAction.detail}
				</p>
			</section>
		{/if}

		<p><a href="/survey">Red Mesa Survey →</a> · <a href="/craft">Crafting + Gear →</a></p>
	</section>

	{#if thumperDemo}
		<section class="run-summary">
			<h2>Active thumper</h2>
			<p>
				Running on <strong>{openRun?.targetDisplayName ?? 'unknown signal'}</strong>.
				{#if openRun?.isPushRun}
					<small>Push run — {eventWindows.length} event windows</small>
				{/if}
			</p>
			{#if openRun?.recalled}
				<p><small>Recalled early — claim when ready.</small></p>
			{:else if thumperDemo.status === 'active'}
				<p>
					<small>~{displaySeconds ?? thumperDemo.secondsRemaining}s remaining</small>
				</p>
			{/if}
			<p><a href="/run"><strong>Open Thumper Run screen →</strong></a></p>
		</section>
	{/if}

	{#if canSubmitClaim}
		<p><a href="/claim"><strong>Claim thumper →</strong></a></p>
	{:else if thumperDemo && !runReadyToResolve}
		<p>Resolve event windows or choose Recall Early before claiming.</p>
	{:else if thumperDemo && !openRun?.recalled && thumperDemo.status !== 'claimable'}
		<p>Wait for the run timer or choose Recall Early to end the run.</p>
	{/if}

	{#if import.meta.env.DEV}
		<details class="dev-panel">
			<summary>Dev</summary>
			{#if hasCompletedTutorial}
				{#if form?.message}
					<p class="flash flash--error">{form.message}</p>
				{/if}
				<form method="POST" action="?/rotateBloom" use:enhance>
					<button type="submit">Rotate bloom</button>
				</form>
				{#if bloomRotation}
					<p><small>Rotated to bloom #{bloomRotation.newBloomId}</small></p>
				{/if}
			{/if}
			<p>
				Resource stat codes from <code>shared</code>:
				{resourceStatCodes.join(', ')}
			</p>
			<p>
				Thumper state from server ({thumperSource}):
				{#if thumperDemo}
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
		</details>
	{/if}
{/if}

<style>
	.pilot-home-summary dl {
		display: grid;
		gap: 0.75rem;
	}

	.pilot-home-summary dt {
		font-weight: 600;
	}

	.pilot-home-summary dd {
		margin: 0.15rem 0 0;
	}

	.pilot-home-summary ul {
		margin: 0.25rem 0 0;
		padding-left: 1.25rem;
	}

	.frame-choice form {
		display: grid;
		gap: 0.75rem;
		max-width: 28rem;
	}

	.frame-option {
		display: grid;
		gap: 0.15rem;
		padding: 0.75rem;
		border: 1px solid #ccc;
	}

	.suggested-next {
		margin-top: 1rem;
		padding-top: 0.75rem;
		border-top: 1px solid #ddd;
	}
</style>
