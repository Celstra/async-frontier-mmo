<script lang="ts">
	import type { ResourceStatCode } from 'shared';

	const resourceStatCodes: ResourceStatCode[] = ['OQ', 'DR', 'EN', 'CD'];
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

{#if import.meta.env.DEV}
	<p data-dev-note>
		<strong>Dev:</strong> resource stat codes from <code>shared</code>:
		{resourceStatCodes.join(', ')}
	</p>
{/if}
