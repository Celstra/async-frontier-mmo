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
	// Prefer load data over stale form data (deploy action result freezes at click time).
	const thumperDemo = $derived(
		form?.claimed ? null : (data.thumperDemo ?? form?.thumperDemo)
	);
	const thumperSource = $derived(
		form?.claimed ? 'claim' : data.thumperDemo ? 'load' : form?.thumperDemo ? 'action' : 'load'
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

<form method="POST" action="?/deploy">
	<button type="submit">Deploy test thumper</button>
</form>

{#if thumperDemo?.status === 'claimable'}
	<form method="POST" action="?/claim">
		<button type="submit">Claim thumper</button>
	</form>
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
		{:else}
			no thumper deployed
		{/if}
	</p>
{/if}
