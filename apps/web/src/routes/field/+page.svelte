<script lang="ts">
	import CommandQueuePanel from '$lib/field/CommandQueuePanel.svelte';
	import InDevelopmentScreen from '$lib/slice/InDevelopmentScreen.svelte';
	import type { PageData } from './$types';

	let { data, form }: { data: PageData; form: import('./$types').ActionData } = $props();

	const commandQueue = $derived(
		form && 'commandQueue' in form ? form.commandQueue : data.commandQueue
	);
	const errorMessage = $derived(
		form && form !== null && 'message' in form && typeof form.message === 'string'
			? form.message
			: null
	);
	const claimNotice = $derived(
		form && form !== null && 'claimed' in form && form.claimed === true ? form : null
	);
	const beatReadout = $derived(
		form && form !== null && 'beatReadout' in form ? form.beatReadout : null
	);
</script>

{#if claimNotice}
	<section class="screen field-claim-notice" data-testid="field-claim-notice" aria-live="polite">
		<header class="screen__header">FIELD: Claim complete</header>
		<div class="screen__body field-claim-notice__body">
			<p>
				Secured <strong>{claimNotice.recoveredQuantity}u</strong> sent to inventory.
			</p>
			<p>
				Return to <a href="/workshop">WORKSHOP</a> or deploy another run from RIG when it returns.
			</p>
		</div>
	</section>
{:else if commandQueue}
	<CommandQueuePanel view={commandQueue} commands={data.commands} {errorMessage} {beatReadout} />
{:else}
	<InDevelopmentScreen screenTitle="FIELD: Red Mesa" screenId={data.screenId} />
{/if}

<style>
	.field-claim-notice__body {
		display: grid;
		gap: 0.75rem;
		padding: 1.1rem 1.25rem;
		color: var(--text-secondary);
		font-size: var(--font-size-sm);
	}

	.field-claim-notice__body p {
		margin: 0;
	}

	.field-claim-notice__body strong {
		color: var(--phosphor);
	}

	.field-claim-notice__body a {
		color: var(--phosphor);
	}
</style>
