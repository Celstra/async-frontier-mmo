<script lang="ts">
	import { resolveThumperState } from '@async-frontier-mmo/domain';
	import type { ResourceStatCode } from 'shared';

	const resourceStatCodes: ResourceStatCode[] = ['OQ', 'DR', 'EN', 'CD'];

	const thumperDemo = resolveThumperState({
		deployedAt: new Date('2024-01-01T00:00:00.000Z'),
		durationSeconds: 60,
		now: new Date('2024-01-01T00:00:30.000Z')
	});
</script>

<h1>Welcome to SvelteKit</h1>
<p>Visit <a href="https://svelte.dev/docs/kit">svelte.dev/docs/kit</a> to read the documentation</p>

{#if import.meta.env.DEV}
	<p data-dev-note>
		<strong>Dev:</strong> resource stat codes from <code>shared</code>:
		{resourceStatCodes.join(', ')}
	</p>
	<p data-dev-note>
		<strong>Dev:</strong> thumper state from <code>@async-frontier-mmo/domain</code>:
		{thumperDemo.status}, {thumperDemo.secondsRemaining}s remaining
	</p>
{/if}
