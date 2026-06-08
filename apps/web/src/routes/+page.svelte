<script lang="ts">
	import type { PageProps } from './$types';
	import type { ResourceStatCode } from 'shared';

	let { data }: PageProps = $props();

	const resourceStatCodes: ResourceStatCode[] = ['OQ', 'DR', 'EN', 'CD'];
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

{#if import.meta.env.DEV}
	<p data-dev-note>
		<strong>Dev:</strong> resource stat codes from <code>shared</code>:
		{resourceStatCodes.join(', ')}
	</p>
	<p data-dev-note>
		<strong>Dev:</strong> thumper state from server <code>load</code> (server-time demo; refresh recalculates
		<code>deployedAt</code>):
		{data.thumperDemo.status}, {data.thumperDemo.secondsRemaining}s remaining
	</p>
{/if}
